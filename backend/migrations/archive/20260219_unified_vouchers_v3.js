const db = require('../config/db');

const up = async () => {
    const client = await db.pool.connect();
    try {
        console.log("🚀 Starting Unified Voucher Migration...");
        await client.query('BEGIN');

        // 1. DROP EXISTING TO UNIFY
        await client.query(`
            DROP TABLE IF EXISTS coupon_reservations CASCADE;
            DROP TABLE IF EXISTS promo_event_tlds CASCADE;
            DROP TABLE IF EXISTS user_vouchers CASCADE;
            DROP TABLE IF EXISTS vouchers CASCADE;
            DROP TABLE IF EXISTS coupons CASCADE;
            DROP TABLE IF EXISTS promo_events CASCADE;
        `);

        // 2. CREATE UNIFIED VOUCHERS TABLE
        await client.query(`
            CREATE TABLE vouchers (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE, -- If null, it's an automatic promo
                title VARCHAR(255) NOT NULL,
                description TEXT,
                banner_image TEXT,
                
                type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage')),
                value DECIMAL(15, 2) NOT NULL DEFAULT 0,
                max_discount DECIMAL(15, 2) DEFAULT 0,
                min_purchase DECIMAL(15, 2) DEFAULT 0,
                
                usage_limit_total INT DEFAULT 0,
                usage_limit_per_user INT DEFAULT 1,
                used_count INT DEFAULT 0,
                locked_count INT DEFAULT 0,
                
                is_stackable BOOLEAN DEFAULT FALSE,
                is_new_user_only BOOLEAN DEFAULT FALSE,
                is_automatic BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                
                priority INT DEFAULT 0,
                segment VARCHAR(20) DEFAULT 'all', -- all, new_user, vip, etc
                
                eligible_tlds JSONB DEFAULT '[]', -- List of TLDs like [".id", ".com"]
                eligible_actions JSONB DEFAULT '["register"]',
                
                start_date TIMESTAMP WITH TIME ZONE,
                end_date TIMESTAMP WITH TIME ZONE,
                valid_until TIMESTAMP WITH TIME ZONE, -- Legacy fallback
                
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX idx_vouchers_code ON vouchers (code) WHERE code IS NOT NULL;
            CREATE INDEX idx_vouchers_active ON vouchers (is_active, start_date, end_date);
            CREATE INDEX idx_vouchers_automatic ON vouchers (is_automatic);
        `);

        // 3. CREATE USER VOUCHERS (CLAIM LIST)
        await client.query(`
            CREATE TABLE user_vouchers (
                id SERIAL PRIMARY KEY,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                coupon_id INT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
                status VARCHAR(20) DEFAULT 'claimed' CHECK (status IN ('claimed', 'used', 'expired')),
                claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                used_at TIMESTAMP WITH TIME ZONE,
                UNIQUE(user_id, coupon_id)
            );
        `);

        // 4. CREATE RESERVATIONS
        await client.query(`
            CREATE TABLE coupon_reservations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                coupon_id INT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
                user_id INT NOT NULL REFERENCES users(id) ON DELETE SET NULL,
                invoice_id VARCHAR(50) NOT NULL,
                reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired'))
            );
        `);

        await client.query('COMMIT');
        console.log("✅ Unified Voucher Tables Created Successfully!");
        process.exit(0);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    } finally {
        client.release();
    }
};

up();
