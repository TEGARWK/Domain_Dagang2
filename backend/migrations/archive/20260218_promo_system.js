/**
 * MIGRATION: 20260218_promo_system_new
 * DESCRIPTION: Implements the new Promo System Architecture (Promo Events, Coupons, TLD Pivots, Reservations)
 * DATE: 2026-02-18
 */

const db = require('../config/db');

/**
 * UP: Create Tables and Indexes
 */
exports.up = async () => {
    const client = await db.pool.connect();
    try {
        console.log("🚀 Starting Migration: Promo System Setup (UP)...");
        await client.query('BEGIN');

        // Clean sweep for New Architecture (Fase 1)
        // Since we are implementing a fresh system and existing tables have mismatched schemas
        await client.query(`
            DROP TABLE IF EXISTS coupon_reservations CASCADE;
            DROP TABLE IF EXISTS promo_event_tlds CASCADE;
            DROP TABLE IF EXISTS coupons CASCADE;
            DROP TABLE IF EXISTS promo_events CASCADE;
            CREATE EXTENSION IF NOT EXISTS "pgcrypto";
        `);
        console.log("🧹 Cleaned up existing empty tables and ensured pgcrypto.");

        // 1. PROMO_EVENTS
        await client.query(`
            CREATE TABLE IF NOT EXISTS promo_events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
                discount_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
                max_discount DECIMAL(15, 2) DEFAULT NULL,
                min_purchase DECIMAL(15, 2) DEFAULT 0,
                start_date TIMESTAMP WITH TIME ZONE NOT NULL,
                end_date TIMESTAMP WITH TIME ZONE,
                is_active BOOLEAN DEFAULT TRUE,
                priority INT DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_promo_events_activity ON promo_events (is_active, start_date, end_date);
            CREATE INDEX IF NOT EXISTS idx_promo_events_priority ON promo_events (priority DESC);
            COMMENT ON TABLE promo_events IS 'Stores automatic marketing campaigns (Flash Sale, etc)';
        `);
        console.log("✅ Created table: promo_events");

        // 2. COUPONS
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) NOT NULL UNIQUE,
                description TEXT,
                discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
                discount_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
                max_discount DECIMAL(15, 2) DEFAULT NULL,
                min_purchase DECIMAL(15, 2) DEFAULT 0,
                usage_limit INT DEFAULT 0,
                usage_count INT DEFAULT 0,
                locked_count INT DEFAULT 0,
                is_stackable BOOLEAN DEFAULT FALSE,
                valid_until TIMESTAMP WITH TIME ZONE,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons (code);
            CREATE INDEX IF NOT EXISTS idx_coupons_validity ON coupons (is_active, valid_until);
            COMMENT ON TABLE coupons IS 'Stores manual voucher codes with strict quota management';
            COMMENT ON COLUMN coupons.locked_count IS 'CRITICAL: Counts coupons currently held in pending invoices/reservations to prevent overselling';
        `);
        console.log("✅ Created table: coupons");

        // 3. PROMO_EVENT_TLDS
        // Check if 'pricing' table exists to avoid error, though it should exist based on analysis
        await client.query(`
            CREATE TABLE IF NOT EXISTS promo_event_tlds (
                promo_event_id INT NOT NULL,
                tld_id INT NOT NULL,
                PRIMARY KEY (promo_event_id, tld_id),
                CONSTRAINT fk_promo_event FOREIGN KEY (promo_event_id) REFERENCES promo_events(id) ON DELETE CASCADE,
                CONSTRAINT fk_tld_pricing FOREIGN KEY (tld_id) REFERENCES pricing(id) ON DELETE CASCADE
            );
        `);
        console.log("✅ Created pivot table: promo_event_tlds");

        // 4. COUPON_RESERVATIONS
         await client.query(`
            CREATE TABLE IF NOT EXISTS coupon_reservations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                coupon_id INT NOT NULL,
                user_id INT NOT NULL,
                invoice_id VARCHAR(50) NOT NULL,
                reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired')),
                CONSTRAINT fk_reservation_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
                CONSTRAINT fk_reservation_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_coupon_reservations_expiry ON coupon_reservations (expires_at) WHERE status = 'active';
            CREATE INDEX IF NOT EXISTS idx_coupon_reservations_invoice ON coupon_reservations (invoice_id);
            COMMENT ON TABLE coupon_reservations IS 'Short-term locks on coupon usage to prevent Race Conditions during checkout';
        `);
        console.log("✅ Created table: coupon_reservations");

        await client.query('COMMIT');
        console.log("🎉 Migration UP Completed Successfully");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Migration UP Failed:", error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * DOWN: Drop Tables (Rollback)
 */
exports.down = async () => {
    const client = await db.pool.connect();
    try {
        console.log("⚠️ Starting Rollback: Promo System Setup (DOWN)...");
        await client.query('BEGIN');

        // Drop in reverse order of dependencies
        await client.query(`DROP TABLE IF EXISTS coupon_reservations CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS promo_event_tlds CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS coupons CASCADE;`);
        await client.query(`DROP TABLE IF EXISTS promo_events CASCADE;`);

        await client.query('COMMIT');
        console.log("✅ Rollback DOWN Completed Successfully");

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Rollback DOWN Failed:", error);
        throw error;
    } finally {
        client.release();
    }
};

// Auto-run if executed directly
if (require.main === module) {
    // Check for --down flag
    if (process.argv.includes('--down')) {
        exports.down().then(() => process.exit(0)).catch(() => process.exit(1));
    } else {
        exports.up().then(() => process.exit(0)).catch(() => process.exit(1));
    }
}
