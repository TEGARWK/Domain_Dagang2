const db = require('../config/db');

async function migrate() {
    console.log("🚀 Starting Schema Fix V6...");
    try {
        // 1. Fix domains table
        console.log("- Updating domains table...");
        await db.pool.query(`
            ALTER TABLE domains 
            ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS is_transfer_locked BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE;
        `);

        // 2. Fix promo_events table
        console.log("- Updating promo_events table...");
        // Check if discount_type exists to rename it
        const peCols = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'promo_events'");
        const colNames = peCols.rows.map(r => r.column_name);

        if (colNames.includes('discount_type') && !colNames.includes('type')) {
            await db.pool.query("ALTER TABLE promo_events RENAME COLUMN discount_type TO type");
        }
        if (colNames.includes('discount_value') && !colNames.includes('value')) {
            await db.pool.query("ALTER TABLE promo_events RENAME COLUMN discount_value TO value");
        }
        
        await db.pool.query(`
            ALTER TABLE promo_events 
            ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255),
            ADD COLUMN IF NOT EXISTS banner_image TEXT,
            ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT TRUE,
            ADD COLUMN IF NOT EXISTS eligible_tlds JSONB DEFAULT '[]';
        `);

        // 3. Fix coupons table
        console.log("- Updating coupons table...");
        const cCols = await db.pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'coupons'");
        const cColNames = cCols.rows.map(r => r.column_name);

        if (cColNames.includes('discount_type') && !cColNames.includes('type')) {
            await db.pool.query("ALTER TABLE coupons RENAME COLUMN discount_type TO type");
        }
        if (cColNames.includes('discount_value') && !cColNames.includes('value')) {
            await db.pool.query("ALTER TABLE coupons RENAME COLUMN discount_value TO value");
        }
        if (cColNames.includes('usage_count') && !cColNames.includes('used_count')) {
            await db.pool.query("ALTER TABLE coupons RENAME COLUMN usage_count TO used_count");
        }
        if (cColNames.includes('usage_limit') && !cColNames.includes('usage_limit_total')) {
            // Keep usage_limit but add usage_limit_total if needed by logic
            await db.pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS usage_limit_total INT DEFAULT 0");
        }

        await db.pool.query(`
            ALTER TABLE coupons 
            ADD COLUMN IF NOT EXISTS title VARCHAR(255),
            ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255),
            ADD COLUMN IF NOT EXISTS banner_image TEXT,
            ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE;
        `);

        // 4. Create user_vouchers table
        console.log("- Creating user_vouchers table...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS user_vouchers (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                coupon_id INT NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
                claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                used_at TIMESTAMP WITH TIME ZONE,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                UNIQUE(user_id, coupon_id)
            );
        `);

        console.log("✅ Schema Fix V6 Completed Successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    }
}

migrate();
