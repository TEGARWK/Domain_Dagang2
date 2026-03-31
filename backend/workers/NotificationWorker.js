const db = require('../config/db');
const NotificationService = require('../services/NotificationService');
const WalletService = require('../services/WalletService');
const EmailService = require('../services/EmailService');

class NotificationWorker {
    async run() {
        console.log("🔔 [NotificationWorker] Starting Job...");
        
        try {
            await this.domainExpiryReminders();
            await this.invoiceReminders();
            await this.lowBalanceAlerts();
            await NotificationService.cleanup();
        } catch (err) {
            console.error("[NotificationWorker] Job Failed:", err);
        }

        console.log("🏁 [NotificationWorker] Job Finished.");
    }

    /**
     * Notify users about domains expiring in 30, 7, or 1 days
     */
    async domainExpiryReminders() {
        console.log("[NotificationWorker] Checking domain expiries...");
        const client = await db.pool.connect();
        try {
            // H-30, H-7, H-1
            const checks = [
                { days: 30, label: "30 hari" },
                { days: 7, label: "7 hari" },
                { days: 1, label: "1 hari" }
            ];

            for (const check of checks) {
                const query = `
                    SELECT d.domain_name, d.user_id, d.expiration_date, u.name as user_name, u.email as user_email
                    FROM domains d
                    JOIN users u ON d.user_id = u.id
                    WHERE d.status = 'active'
                    AND d.expiration_date::date = (CURRENT_DATE + INTERVAL '${check.days} days')::date
                `;
                const { rows } = await client.query(query);
                
                for (const domain of rows) {
                    // 1. Dashboard Notification
                    await NotificationService.createNotification(
                        domain.user_id,
                        "Pengingat Perpanjangan Domain",
                        `Domain ${domain.domain_name} akan berakhir dalam ${check.label}. Segera perpanjang agar tidak kehilangan domain Anda.`,
                        'warning',
                        `${domain.domain_name}_exp_${check.days}`,
                        'domain_expiry'
                    );

                    // 2. Email Notification
                    const userObj = { name: domain.user_name, email: domain.user_email };
                    EmailService.sendExpiryReminder(
                        userObj, 
                        domain.domain_name, 
                        check.label, 
                        domain.expiration_date
                    ).catch(e => console.error(`[NotificationWorker] Expiry Email Failed for ${domain.domain_name}:`, e));
                }
            }
        } finally {
            client.release();
        }
    }

    /**
     * Notify users about unpaid invoices older than 1 day
     */
    async invoiceReminders() {
        console.log("[NotificationWorker] Checking unpaid invoices...");
        const client = await db.pool.connect();
        try {
            const query = `
                SELECT i.id, i.user_id, i.total 
                FROM invoices i
                WHERE i.status = 'pending'
                AND i.created_at < NOW() - INTERVAL '1 day'
                AND i.created_at > NOW() - INTERVAL '3 days' -- Only remind for recent ones
            `;
            const { rows } = await client.query(query);

            for (const invoice of rows) {
                await NotificationService.createNotification(
                    invoice.user_id,
                    "Tagihan Belum Dibayar",
                    `Invoice #${invoice.id} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoice.total)} masih menunggu pembayaran.`,
                    'info',
                    invoice.id.toString(),
                    'unpaid_invoice'
                );
            }
        } finally {
            client.release();
        }
    }

    /**
     * Notify users if wallet balance is below 100k
     */
    async lowBalanceAlerts() {
        console.log("[NotificationWorker] Checking low wallet balances...");
        const client = await db.pool.connect();
        try {
            // Only alert users who have active domains with auto-renew enabled
            const query = `
                SELECT DISTINCT u.id, u.name 
                FROM users u
                JOIN domains d ON u.id = d.user_id
                WHERE d.auto_renew = TRUE AND d.status = 'active'
            `;
            const { rows } = await client.query(query);

            for (const user of rows) {
                const balance = await WalletService.getBalance(user.id);
                if (balance < 100000) {
                    await NotificationService.createNotification(
                        user.id,
                        "Saldo Wallet Tipis",
                        `Saldo wallet Anda (Rp ${new Intl.NumberFormat('id-ID').format(balance)}) berada di bawah Rp 100.000. Segera top up untuk memastikan lancarnya perpanjangan otomatis domain Anda.`,
                        'warning',
                        'low_balance_100k',
                        'wallet_balance'
                    );
                }
            }
        } finally {
            client.release();
        }
    }
}

module.exports = new NotificationWorker();

// CLI Support
if (require.main === module) {
    new NotificationWorker().run().then(() => {
        setTimeout(() => process.exit(), 5000);
    });
}
