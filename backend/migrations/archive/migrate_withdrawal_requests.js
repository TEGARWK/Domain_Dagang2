const db = require('../config/db');

async function migrate() {
    console.log("🚀 Starting Migration: Withdrawal Requests Table...");
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create withdrawal_requests table
        console.log("👉 Creating table 'withdrawal_requests'...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS withdrawal_requests (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                fee DECIMAL(15,2) DEFAULT 0,
                method VARCHAR(50), 
                account_number VARCHAR(100),
                account_name VARCHAR(100),
                status VARCHAR(30) DEFAULT 'pending',
                admin_notes TEXT,
                processed_by INT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Add Index for faster lookup
        await client.query(`CREATE INDEX IF NOT EXISTS idx_withdrawal_user ON withdrawal_requests(user_id);`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_withdrawal_status ON withdrawal_requests(status);`);
        
        await client.query('COMMIT');
        console.log("✅ Migration Successful: withdrawal_requests table created.");
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
}

migrate();
