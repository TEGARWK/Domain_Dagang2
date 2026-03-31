const db = require('../config/db');

async function migrate() {
    const client = await db.pool.connect();
    try {
        console.log("🚀 Starting Disbursement Migration...");
        await client.query('BEGIN');

        // 1. Wallets Table Update
        console.log("--> Updating wallets table...");
        const walletCols = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='wallets' AND column_name='balance_locked'
        `);
        
        if (walletCols.rows.length === 0) {
            await client.query(`ALTER TABLE wallets ADD COLUMN balance_locked DECIMAL(15,2) DEFAULT 0.00`);
            console.log("    ✅ Added balance_locked");
        } else {
            console.log("    ℹ️  balance_locked already exists");
        }

        // 2. Withdraw Transactions Table
        console.log("--> Creating withdraw_transactions table...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS withdraw_transactions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                idempotency_key VARCHAR(100) UNIQUE,
                amount DECIMAL(15,2) NOT NULL,
                bank_code VARCHAR(20) NOT NULL,
                bank_name VARCHAR(100),
                account_number VARCHAR(50) NOT NULL,
                account_name VARCHAR(100) NOT NULL,
                reference_id VARCHAR(100), 
                status VARCHAR(20) DEFAULT 'pending',
                gateway_response TEXT,
                failure_reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("    ✅ withdraw_transactions table checked/created");

        await client.query('COMMIT');
        console.log("🎉 Migration Success!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
