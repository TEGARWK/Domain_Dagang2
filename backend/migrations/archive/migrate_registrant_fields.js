const db = require('../config/db');

const migrate = async () => {
    try {
        console.log("🚀 Starting Registrant Data Schema Migration...");

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Alter Users Table
            console.log("Alter Users Table...");
            await client.query(`
                ALTER TABLE users 
                ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
                ADD COLUMN IF NOT EXISTS city VARCHAR(100),
                ADD COLUMN IF NOT EXISTS state VARCHAR(100),
                ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20),
                ADD COLUMN IF NOT EXISTS country VARCHAR(50) DEFAULT 'ID';
            `);

            // 2. Alter Domains Table - Add JSON column for snapshot
            console.log("Alter Domains Table...");
            await client.query(`
                ALTER TABLE domains 
                ADD COLUMN IF NOT EXISTS registrant_snapshot JSONB; 
            `);

            await client.query('COMMIT');
            console.log("✅ Migration Success!");
        } catch (err) {
            await client.query('ROLLBACK');
            console.error("❌ Transaction Failed:", err);
            throw err;
        } finally {
            client.release();
        }

        process.exit(0);
    } catch (e) {
        console.error("❌ Migration Script Error:", e);
        process.exit(1);
    }
};

migrate();
