const cron = require('node-cron');
const db = require('../config/db');
const OrderService = require('./OrderService');

class ReconciliationService {
    constructor() {
        // Run every 5 minutes
        this.schedule = '*/5 * * * *';
    }

    init() {
        // Reconciliation worker initialization
        cron.schedule(this.schedule, () => {
            this.runReconciliation();
        });
    }

    async runReconciliation() {

        const client = await db.pool.connect();
        try {
            // Find domains stuck in 'REGISTERING' or 'FAILED' with low attempt count
            // We retry 'FAILED' too if it was a technical error (not 'Taken')
            const query = `
                SELECT d.*, i.id as invoice_id
                FROM domains d
                JOIN invoice_items ii ON d.domain_name = ii.name
                JOIN invoices i ON ii.invoice_id = i.id
                WHERE d.status IN ('pending_reg', 'registering', 'failed')
                AND d.registration_attempt_count < 3
                AND (d.last_registration_error IS NULL OR (d.last_registration_error NOT LIKE '%taken%'
                AND d.last_registration_error NOT LIKE '%already registered%'))
                LIMIT 10
            `;
            const res = await client.query(query);

            if (res.rows.length === 0) {

                return;
            }



            for (const row of res.rows) {

                // Trigger activateDomain again. It handles locking and status updates.
                await OrderService.activateDomain(row.invoice_id);
            }

        } catch (err) {
            console.error("❌ [ReconciliationService] Worker Error:", err.message);
        } finally {
            client.release();
        }
    }
}

module.exports = new ReconciliationService();
