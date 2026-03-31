const db = require('../config/db');
const InvoiceService = require('../services/InvoiceService');
const WalletService = require('../services/WalletService');
const OrderService = require('../services/OrderService');
const EmailService = require('../services/EmailService');

class AutoRenewalWorker {
    
    async run() {

        const client = await db.pool.connect();
        try {
            // 1. Find Expiring Domains (Active, AutoRenew=True, Expiring within 7 days)
            // AND ensure we haven't already created a PENDING renewal invoice for this domain recently
            // (A simplified check: if there is a pending invoice with item name = domain name AND action = renew)
            
            const expiringDomains = await client.query(`
                SELECT d.*, u.email, u.name as user_name, u.id as user_id
                FROM domains d
                JOIN users u ON d.user_id = u.id
                WHERE d.status = 'active' 
                AND d.auto_renew = TRUE 
                AND d.expiration_date <= NOW() + INTERVAL '7 days'
                AND d.expiration_date > NOW() -- Don't try to renew already expired ones automatically? Or do we? Let's say yes but focus on near expiry.
            `);

            console.log(`[AutoRenew] Found ${expiringDomains.rows.length} candidates.`);

            for (const domain of expiringDomains.rows) {
                await this.processDomain(client, domain);
            }

        } catch (err) {
            console.error("[AutoRenew] Worker Failed:", err);
        } finally {
            client.release();

        }
    }

    async processDomain(client, domain) {
        const domainName = domain.domain_name;
        const userId = domain.user_id;

        try {
            console.log(`[AutoRenew] Processing ${domainName}...`);

            // Check for existing pending renewal invoice
            const pendingCheck = await client.query(`
                SELECT i.id FROM invoices i
                JOIN invoice_items ii ON i.id = ii.invoice_id
                WHERE i.user_id = $1 
                AND i.status = 'pending' 
                AND ii.name = $2 
                AND ii.action_type = 'renew'
            `, [userId, domainName]);

            if (pendingCheck.rows.length > 0) {
                console.log(`[AutoRenew] Pending renewal invoice exists for ${domainName}. Skipping.`);
                return;
            }

            // check pricing
            const tld = "." + domainName.split('.').slice(1).join('.');
            const pricingRes = await client.query("SELECT price_renew, cost_renew FROM pricing WHERE tld = $1", [tld]);
            if (pricingRes.rows.length === 0) {
                console.error(`[AutoRenew] No pricing for ${tld}`);
                return;
            }
            const pricing = pricingRes.rows[0];
            const price = parseFloat(pricing.price_renew);

            // Create Invoice
            const items = [{
                name: domainName,
                description: `Auto Renewal 1 Year`,
                action: 'renew',
                duration: 1,
                unit_price: price,
                total_line_price: price, // Assuming 1 year
                cost_price: parseFloat(pricing.cost_renew),
                pricing_source: 'auto_renew'
            }];

            const calc = {
                subtotal: price,
                totalDiscount: 0,
                netAmount: price,
                taxAmount: 0,
                finalAmount: price,
                totalCost: parseFloat(pricing.cost_renew),
                profitAmount: price - parseFloat(pricing.cost_renew),
                profitMarginPercent: 0,
                taxSubsidyAmount: 0
            };

            const invoiceResult = await InvoiceService.create(userId, items, null, null, calc);
            const invoiceId = invoiceResult.invoiceId;
            console.log(`[AutoRenew] Invoice Created: ${invoiceId}`);

            // Attempt Payment
            try {
                const balance = await WalletService.getBalance(userId);
                
                if (balance >= price) {
                    await WalletService.debit(userId, price, 'RENEWAL', invoiceId, `Auto Renew ${domainName}`);
                    
                    // Mark Paid
                    await client.query("UPDATE invoices SET status = 'paid', payment_method = 'WALLET_AUTO' WHERE id = $1", [invoiceId]);
                    
                    // Create Payment Record
                    const refNo = `AUTO-${Date.now()}`;
                    await client.query(`
                        INSERT INTO payments (invoice_number, transaction_id, amount, payment_method, status, raw_response, updated_at)
                        VALUES ($1, $2, $3, 'WALLET_AUTO', 'PAID', '{}', NOW())
                    `, [invoiceId, refNo, price]);

                    // Activate
                    await OrderService.activateDomain(invoiceId);

                    // NOTIFICATION: Auto-Renew Success
                    const NotificationService = require('../services/NotificationService');
                    await NotificationService.createNotification(userId, 
                        "Auto Renew Berhasil", 
                        `Domain ${domainName} Anda berhasil diperpanjang otomatis selama 1 tahun.`, 
                        'success', domainName, 'auto_renewal');

                    // Email Success
                    EmailService.send('DOMAIN_ACTIVE', {
                        to: domain.email,
                        user: { name: domain.user_name },
                        domain: { name: domainName, expiry_date: 'Updated' } // logic in activateDomain updates date
                    });
                    console.log(`[AutoRenew] Success for ${domainName}`);

                } else {
                    console.log(`[AutoRenew] Insufficient Balance for ${domainName}. Balance: ${balance}, Needed: ${price}`);
                    
                    // NOTIFICATION: Auto-Renew Failed (Low Balance)
                    const NotificationService = require('../services/NotificationService');
                    await NotificationService.createNotification(userId, 
                        "Auto Renew Gagal", 
                        `Perpanjangan otomatis untuk ${domainName} gagal karena saldo wallet tidak mencukupi.`, 
                        'error', domainName, 'auto_renewal_failed');
                    
                    // Email Low Balance
                    // EmailService.send('LOW_BALANCE', ...) // TODO: Create Template
                }

            } catch (payErr) {
                console.error(`[AutoRenew] Payment Failed: ${payErr.message}`);
            }

        } catch (err) {
            console.error(`[AutoRenew] Error processing ${domainName}:`, err);
        }
    }
}

module.exports = new AutoRenewalWorker();

// Allow running directly
if (require.main === module) {
    new AutoRenewalWorker().run().then(() => {
        setTimeout(() => process.exit(), 5000); // Allow async tasks to finish
    });
}
