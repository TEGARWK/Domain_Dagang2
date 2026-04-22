const db = require('../config/db');

async function migrate() {
    console.log("🚀 Starting Schema Fix V7 (Coupons & Reservations)...");
    try {
        // 1. Update coupons table with missing columns
        console.log("- Updating coupons table...");
        await db.pool.query(`
            ALTER TABLE coupons 
            ADD COLUMN IF NOT EXISTS usage_limit_per_user INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS locked_count INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_stackable BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;
        `);

        // 2. Create coupon_reservations table
        console.log("- Creating coupon_reservations table...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS coupon_reservations (
                id SERIAL PRIMARY KEY,
                user_id INT REFERENCES users(id) ON DELETE CASCADE,
                coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
                invoice_id VARCHAR(100) REFERENCES invoices(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'LOCKED',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);

        console.log("✅ Schema Fix V7 Completed Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    }
}

migrate();
