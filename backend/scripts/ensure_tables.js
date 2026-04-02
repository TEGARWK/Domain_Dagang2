const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

async function run() {
    console.log("🚀 Starting database schema check...");
    
    const queries = [
        `CREATE TABLE IF NOT EXISTS coupons (
            id SERIAL PRIMARY KEY,
            code VARCHAR(50) NOT NULL UNIQUE,
            title VARCHAR(255),
            subtitle VARCHAR(255),
            description TEXT,
            banner_image TEXT,
            type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage')),
            value DECIMAL(15, 2) NOT NULL DEFAULT 0,
            max_discount DECIMAL(15, 2) DEFAULT 0,
            min_purchase DECIMAL(15, 2) DEFAULT 0,
            usage_limit INT DEFAULT 0,
            usage_limit_total INT DEFAULT 0,
            used_count INT DEFAULT 0,
            is_automatic BOOLEAN DEFAULT FALSE,
            valid_until TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            eligible_tlds JSONB DEFAULT '[]',
            eligible_actions JSONB DEFAULT '["register"]',
            is_stackable BOOLEAN DEFAULT FALSE,
            is_new_user_only BOOLEAN DEFAULT FALSE,
            start_date TIMESTAMP WITH TIME ZONE,
            end_date TIMESTAMP WITH TIME ZONE,
            usage_limit_per_user INT DEFAULT 1,
            priority INT DEFAULT 0,
            segment VARCHAR(50) DEFAULT 'all',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS promo_events (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            subtitle VARCHAR(255),
            description TEXT,
            banner_image TEXT,
            type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage')),
            value DECIMAL(15, 2) NOT NULL DEFAULT 0,
            max_discount DECIMAL(15, 2) DEFAULT 0,
            min_purchase DECIMAL(15, 2) DEFAULT 0,
            start_date TIMESTAMP WITH TIME ZONE,
            end_date TIMESTAMP WITH TIME ZONE,
            valid_until TIMESTAMP WITH TIME ZONE,
            is_active BOOLEAN DEFAULT TRUE,
            is_automatic BOOLEAN DEFAULT TRUE,
            eligible_tlds JSONB DEFAULT '[]',
            eligible_actions JSONB DEFAULT '["register"]',
            priority INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS faqs (
            id SERIAL PRIMARY KEY,
            question TEXT NOT NULL,
            answer TEXT NOT NULL,
            category VARCHAR(50) DEFAULT 'Umum',
            is_active BOOLEAN DEFAULT TRUE,
            order_num INT DEFAULT 0,
            priority INT DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS user_vouchers (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE CASCADE,
            coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
            claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            used_at TIMESTAMP WITH TIME ZONE,
            status VARCHAR(20) DEFAULT 'claimed',
            UNIQUE(user_id, coupon_id)
        );`
    ];

    try {
        for (const q of queries) {
            await pool.query(q);
            console.log("✅ Table checked/created successfully.");
        }
        
        // Add some safety checks for missing columns
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS eligible_tlds JSONB DEFAULT '[]'"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS eligible_actions JSONB DEFAULT '[\"register\"]'"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_stackable BOOLEAN DEFAULT FALSE"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_new_user_only BOOLEAN DEFAULT FALSE"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS usage_limit_per_user INT DEFAULT 1"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0"); } catch(e){}
        try { await pool.query("ALTER TABLE coupons ADD COLUMN IF NOT EXISTS segment VARCHAR(50) DEFAULT 'all'"); } catch(e){}

        try { await pool.query("ALTER TABLE promo_events ADD COLUMN IF NOT EXISTS eligible_tlds JSONB DEFAULT '[]'"); } catch(e){}
        try { await pool.query("ALTER TABLE promo_events ADD COLUMN IF NOT EXISTS eligible_actions JSONB DEFAULT '[\"register\"]'"); } catch(e){}
        try { await pool.query("ALTER TABLE promo_events ADD COLUMN IF NOT EXISTS valid_until TIMESTAMP WITH TIME ZONE"); } catch(e){}
        try { await pool.query("ALTER TABLE promo_events ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT TRUE"); } catch(e){}

        console.log("💎 Schema verification complete!");
    } catch (err) {
        console.error("❌ Fatal Error during schema fix:", err.message);
    } finally {
        await pool.end();
    }
}

run();
