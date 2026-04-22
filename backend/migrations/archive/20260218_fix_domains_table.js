const db = require('../config/db');

exports.up = async () => {
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        
        console.log("🚀 Adding Registrar columns to 'domains' table...");
        
        await client.query(`
            ALTER TABLE domains 
            ADD COLUMN IF NOT EXISTS registrar_name VARCHAR(50) DEFAULT 'daftarnama',
            ADD COLUMN IF NOT EXISTS registrar_order_id VARCHAR(100),
            ADD COLUMN IF NOT EXISTS registrar_domain_id VARCHAR(100),
            ADD COLUMN IF NOT EXISTS registrar_response_raw JSONB,
            ADD COLUMN IF NOT EXISTS last_registration_error TEXT,
            ADD COLUMN IF NOT EXISTS registration_attempt_count INTEGER DEFAULT 0,
            ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS registration_date TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS registrant_snapshot JSONB,
            ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE
        `);

        await client.query('COMMIT');
        console.log("✅ domains table updated successfuly.");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Failed to update domains table:", err.message);
        throw err;
    } finally {
        client.release();
    }
};

if (require.main === module) {
    exports.up().then(() => process.exit()).catch(() => process.exit(1));
}
