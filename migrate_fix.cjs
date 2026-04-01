const { query } = require('./backend/config/db');

async function migrate() {
    try {
        await query('ALTER TABLE transfer_requests ADD COLUMN IF NOT EXISTS invoice_id VARCHAR(100) REFERENCES invoices(id) ON DELETE SET NULL');
        console.log("✅ Column invoice_id added to transfer_requests");
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
    }
    process.exit(0);
}

migrate();
