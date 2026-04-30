const db = require('../config/db');
const OrderService = require('../services/OrderService');
const PrismalinkService = require('../services/PrismaLinkService');

class PrismaLinkController {
    /**
     * Inisialisasi Pembayaran Prismalink
     */
    async initializePayment(req, res) {
        const { invoice_number, payment_channel } = req.body;
        const userId = req.user.id;

        try {
            // 0. Cek Konfigurasi
            const configRes = await db.pool.query("SELECT is_active, provider FROM payment_gateways WHERE provider = 'prismalink' LIMIT 1");
            if (!configRes.rows[0]?.is_active) {
                return res.status(403).json({ success: false, message: "Prismalink tidak aktif." });
            }

            const invRes = await db.pool.query(`
                SELECT i.id, i.user_id, i.total, i.final_amount, 
                       u.name as user_name, u.email as user_email, u.phone as user_phone
                FROM invoices i
                JOIN users u ON i.user_id = u.id
                WHERE i.id = $1 AND i.user_id = $2
            `, [invoice_number, userId]);

            if (invRes.rows.length === 0) return res.status(404).json({ success: false, message: "Invoice tidak ditemukan" });
            const invoice = invRes.rows[0];

            const itemsRes = await db.pool.query(`
                SELECT name as item_title, price as total, 1 as quantity
                FROM invoice_items 
                WHERE invoice_id = $1
            `, [invoice_number]);

            let amountFromInv = parseFloat(invoice.final_amount || invoice.total || 0);
            console.log(`[DEBUG] Amount from Invoice Record: ${amountFromInv}`);
            
            let amountFromItems = 0;
            if (itemsRes.rows.length > 0) {
                amountFromItems = itemsRes.rows.reduce((acc, it) => acc + Math.floor(parseFloat(it.total || 0)), 0);
            }
            console.log(`[DEBUG] Amount accumulated from Items: ${amountFromItems}`);

            let amountToSend = Math.floor(amountFromInv > 0 ? amountFromInv : amountFromItems);
            console.log(`[DEBUG] Final amountToSend to Service: ${amountToSend}`);

            if (amountToSend <= 0) {
                throw new Error(`Nominal transaksi 0 (Inv: ${amountFromInv}, Items: ${amountFromItems}). Hubungi admin.`);
            }

            const invoiceItems = itemsRes.rows.length > 0 
                ? itemsRes.rows.map(it => ({ ...it, total: String(Math.floor(parseFloat(it.total))) }))
                : [{ item_title: `Invoice #${invoice.id}`, total: String(amountToSend), quantity: 1 }];

            const result = await PrismalinkService.createTransaction({
                order_id: invoice.id, 
                amount: amountToSend,
                customer_id: userId,
                customer_name: invoice.user_name,
                customer_email: invoice.user_email,
                customer_phone: invoice.user_phone,
                payment_method: payment_channel,
                description: `Invoice #${invoice.id}`,
                items: invoiceItems
            });

            if (!result.success) throw new Error(result.error || "Gagal ke Prismalink");

            // Handle va_number_list yang bisa berupa string JSON atau sudah diparse jadi Array
            let vaData = [];
            try {
                if (Array.isArray(result.data.va_number_list)) {
                    vaData = result.data.va_number_list;
                } else if (typeof result.data.va_number_list === 'string') {
                    vaData = JSON.parse(result.data.va_number_list);
                }
            } catch (pErr) {
                console.warn('[Prismalink] Failed to parse va_number_list:', pErr.message);
                vaData = [];
            }
            
            const vaNumber = (vaData && vaData.length > 0) ? vaData[0].va : null;

            await db.pool.query("DELETE FROM payments WHERE invoice_number = $1", [invoice.id]);
            await db.pool.query(`
                INSERT INTO payments (
                    invoice_number, transaction_id, payment_method, amount, status, 
                    plink_ref_no, va_number, expired_at, created_at
                ) VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, NOW())
            `, [invoice.id, result.data.plink_ref_no || invoice.id, payment_channel, amountToSend, result.data.plink_ref_no, vaNumber, result.data.validity || null]);

            res.json({ 
                success: true, 
                data: {
                    ...result.data,
                    customer_name: invoice.user_name // Kirim nama asli agar muncul di VA Card
                } 
            });

        } catch (err) {
            console.error('❌ [Prismalink Fatal Error]:', err.message);
            res.status(500).json({ success: false, message: err.message });
        }
    }

    /**
     * Webhook Handler
     */
    async handleWebhook(req, res) {
        const incomingMac = req.headers['mac'];
        const body = req.body;

        try {
            const isValid = await PrismalinkService.verifyWebhook(body, incomingMac);
            let status = body.payment_status || body.transaction_status || body.status;
            let response_code = body.response_code || body.res_code || body.bank_response_code;
            let merchant_ref_no = body.merchant_ref_no || body.external_id;

            const invRes = await db.pool.query("SELECT * FROM invoices WHERE id = $1", [merchant_ref_no]);
            if (invRes.rows.length === 0) return res.status(404).send('Invoice not found');
            const invoice = invRes.rows[0];

            if (invoice.status === 'paid' || invoice.status === 'PAID') {
                console.log(`[Prismalink Webhook] Invoice ${merchant_ref_no} already PAID. Skipping.`);
                return res.status(200).send('OK');
            }

            const isSuccess = status === 'SETLD' || status === 'SUCCESS' || response_code === '00' || response_code === 'PL000';
            
            if (isSuccess) {
                // Check if it's a Topup
                const itemRes = await db.pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [merchant_ref_no]);
                const items = itemRes.rows;
                const isTopUp = invoice.type === 'TOPUP' || merchant_ref_no.startsWith('TOPUP-') || items.some(it => it.action_type === 'topup' || (it.name || '').toLowerCase().includes('top up'));

                if (isTopUp) {
                    console.log(`💰 [Prismalink Webhook] Topup detected. Crediting ${invoice.total} to UserID: ${invoice.user_id}`);
                    const WalletService = require('../services/WalletService');
                    await WalletService.credit(
                        invoice.user_id, 
                        parseFloat(invoice.total), 
                        'TOPUP', 
                        merchant_ref_no, 
                        'Top Up Wallet via Prismalink'
                    );
                } else {
                    console.log(`🚀 [Prismalink Webhook] Triggering Domain Activation for: ${merchant_ref_no}`);
                    await OrderService.activateDomain(merchant_ref_no);
                }

                await db.pool.query("UPDATE payments SET status = 'SUCCESS', updated_at = NOW() WHERE invoice_number = $1", [merchant_ref_no]);
            } else if (status === 'REJEC' || status === 'FAILED') {
                await db.pool.query("UPDATE invoices SET status = 'failed', updated_at = NOW() WHERE id = $1", [merchant_ref_no]);
            }

            res.status(200).send('OK');
        } catch (err) {
            console.error('[Prismalink Webhook] Error:', err.message);
            res.status(500).send('Internal Error');
        }
    }

    /**
     * Check Status
     */
    async checkStatus(req, res) {
        const { id } = req.params;
        try {
            const result = await db.pool.query("SELECT status FROM invoices WHERE id = $1", [id]);
            if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Invoice not found' });
            res.json({ success: true, status: result.rows[0].status });
        } catch (err) {
            res.status(500).json({ success: false, message: err.message });
        }
    }
}

module.exports = new PrismaLinkController();
