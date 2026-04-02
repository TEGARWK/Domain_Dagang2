const db = require("../config/db");

class InvoiceService {
    /**
     * Create Invoice and its items
     * Now accepts a comprehensive financial results object for production-grade tracking.
     */
    async create(userId, items, promoCode, client = null, calculationResults = {}, config = {}, customInvoiceId = null, type = 'DOMAIN') {
        let shouldRelease = false;
        if (!client) {
            client = await db.pool.connect();
            shouldRelease = true;
            await client.query('BEGIN');
        }

        try {
            const {
                subtotal,
                totalDiscount,
                netAmount,
                taxAmount,
                finalAmount,
                totalCost,
                profitAmount,
                profitMarginPercent,
                taxSubsidyAmount
            } = calculationResults;

            // 1. Create Invoice Record with granular financial metrics
            const invoiceNumber = customInvoiceId || `INV-${Date.now()}`;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 1);

            const insertInvoice = `
                INSERT INTO invoices (
                    id, user_id, due_date, status, date, coupon_code,
                    subtotal, total_discount, net_amount, tax_amount, 
                    final_amount, total_cost, profit_amount, 
                    profit_margin_percent, tax_subsidy_amount, total, checkout_config,
                    payment_method, payment_reference, plink_ref_no, type
                ) VALUES (
                    $1, $2, $3, 'pending', NOW(), $4, 
                    $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
                    $16, $17, $18, $19
                )
            `;
            await client.query(insertInvoice, [
                invoiceNumber, userId, dueDate, promoCode,
                subtotal || 0, totalDiscount || 0, netAmount || 0, taxAmount || 0, 
                finalAmount || 0, totalCost || 0, profitAmount || 0, 
                profitMarginPercent || 0, taxSubsidyAmount || 0, finalAmount || 0, JSON.stringify(config || {}),
                null, null, null, type
            ]);

            // 2. Insert Items with Cost Tracking
            for (const item of items) {
                const insertItem = `
                    INSERT INTO invoice_items (
                        invoice_id, name, description, price, unit_price, years, pricing_source, action_type, cost_price
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `;
                const description = this.getDescription(item.action, item.duration);
                await client.query(insertItem, [
                    invoiceNumber, item.name, description, item.total_line_price, 
                    item.unit_price, item.duration, item.pricing_source || 'db_pricing', item.action, item.cost_price || 0
                ]);
            }

            if (shouldRelease) {
                await client.query('COMMIT');
            }

            return { success: true, invoiceId: invoiceNumber, total: finalAmount };

        } catch (error) {
            if (shouldRelease) {
                await client.query('ROLLBACK');
            }
            throw error;
        } finally {
            if (shouldRelease) {
                client.release();
            }
        }
    }

    getDescription(action, duration) {
        if (action === 'renew') return `Perpanjangan Domain ${duration} Tahun`;
        if (action === 'transfer') return `Transfer Domain (+ ${duration} Tahun)`;
        if (action === 'restore') return `Pemulihan Domain (Redemption Restore)`;
        return `Registration Domain ${duration} Year`;
    }
}

module.exports = new InvoiceService();
