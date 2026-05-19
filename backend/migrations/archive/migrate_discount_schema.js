const { pool } = require('../config/db');

async function migrate() {
    const client = await pool.connect();
    try {
        console.log("🚀 Starting Discount System Migration (Debug Mode)...");
        await client.query('BEGIN');

        // DROP existing new tables to ensure clean slate
        console.log("Dropping existing discount tables...");
        await client.query(`DROP TABLE IF EXISTS coupon_reservations`);
        await client.query(`DROP TABLE IF EXISTS promo_event_tlds`);
        await client.query(`DROP TABLE IF EXISTS promo_events`);
        await client.query(`DROP TABLE IF EXISTS coupons`);

        // 1. Create promo_events table
        console.log("Creating table: promo_events...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS promo_events (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                slug VARCHAR(100),
                discount_type VARCHAR(20), -- Expanded for safety
                discount_value DECIMAL(15, 2) NOT NULL,
                max_discount_amount DECIMAL(15, 2) DEFAULT 0,
                start_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
                end_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW() + INTERVAL '1 year',
                priority INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 2. Create promo_event_tlds table
        console.log("Creating table: promo_event_tlds...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS promo_event_tlds (
                id SERIAL PRIMARY KEY,
                promo_event_id INTEGER REFERENCES promo_events(id) ON DELETE CASCADE,
                tld VARCHAR(10) NOT NULL,
                min_purchase_amount DECIMAL(15, 2) DEFAULT 0,
                UNIQUE(promo_event_id, tld)
            );
        `);

        // 3. Create coupons table
        console.log("Creating table: coupons...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupons (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                title VARCHAR(100),
                discount_type VARCHAR(20),
                discount_value DECIMAL(15, 2) NOT NULL,
                min_purchase_amount DECIMAL(15, 2) DEFAULT 0,
                max_discount_amount DECIMAL(15, 2) DEFAULT 0,
                
                usage_limit_global INTEGER DEFAULT 0,
                usage_limit_per_user INTEGER DEFAULT 1,
                
                used_count INTEGER DEFAULT 0,
                locked_count INTEGER DEFAULT 0,
                
                start_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                expires_at TIMESTAMP WITH TIME ZONE,
                
                is_stackable BOOLEAN DEFAULT FALSE,
                is_new_user_only BOOLEAN DEFAULT FALSE,
                is_active BOOLEAN DEFAULT TRUE,
                
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 4. Create coupon_reservations table
        console.log("Creating table: coupon_reservations...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS coupon_reservations (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                coupon_id INTEGER REFERENCES coupons(id),
                user_id INTEGER REFERENCES users(id),
                invoice_id VARCHAR(50) UNIQUE,
                reserved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                status VARCHAR(20) DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'USED', 'EXPIRED', 'CANCELLED'))
            );
        `);

        // 5. Migrate Data
        console.log("Migrating legacy data from 'vouchers'...");
        const legacyRes = await client.query("SELECT * FROM vouchers");
        
        for (const v of legacyRes.rows) {
            try {
                let dType = v.type;
                if (dType === 'fixed') dType = 'fixed_amount';

                const startDate = v.start_date || v.valid_from || new Date();
                const endDate = v.end_date || v.valid_until || new Date(Date.now() + 31536000000); 

                if (v.is_automatic) {
                    console.log(`Migrating Auto Voucher [${v.code}]...`);
                    const slug = (v.code.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000)).substring(0, 100);
                    
                    const promoValues = [
                        v.title || v.code, 
                        slug, 
                        dType, 
                        v.value, 
                        v.max_discount || 0,
                        startDate,
                        endDate,
                        v.priority || 0,
                        v.is_active
                    ];

                    const promoRes = await client.query(`
                        INSERT INTO promo_events (
                            title, slug, discount_type, discount_value, max_discount_amount,
                            start_at, end_at, priority, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                        RETURNING id
                    `, promoValues);
                    
                    const promoId = promoRes.rows[0].id;
                    
                    let tlds = [];
                    try {
                        if (typeof v.eligible_tlds === 'string') tlds = JSON.parse(v.eligible_tlds);
                        else if (Array.isArray(v.eligible_tlds)) tlds = v.eligible_tlds;
                    } catch(e) {}

                    for (const tld of tlds) {
                        if (typeof tld === 'string') {
                            const cleanTld = tld.startsWith('.') ? tld : `.${tld}`;
                            await client.query(`
                                INSERT INTO promo_event_tlds (promo_event_id, tld, min_purchase_amount)
                                VALUES ($1, $2, $3)
                                ON CONFLICT DO NOTHING
                            `, [promoId, cleanTld, v.min_purchase || 0]);
                        }
                    }

                } else {
                    console.log(`Migrating Manual Voucher [${v.code}]...`);
                    const couponValues = [
                        v.code,
                        v.title || v.code,
                        dType,
                        v.value,
                        v.min_purchase || 0,
                        v.max_discount || 0,
                        v.usage_limit_total || 0, 
                        v.usage_limit_per_user || 1,
                        v.used_count || 0,
                        startDate,
                        endDate,
                        !!v.is_stackable,
                        !!v.is_new_user_only,
                        v.is_active
                    ];

                    await client.query(`
                        INSERT INTO coupons (
                            code, title, discount_type, discount_value, min_purchase_amount, max_discount_amount,
                            usage_limit_global, usage_limit_per_user, used_count, locked_count,
                            start_at, expires_at, is_stackable, is_new_user_only, is_active
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, $10, $11, $12, $13, $14)
                        ON CONFLICT (code) DO NOTHING
                    `, couponValues);
                }
            } catch (err) {
                 console.error(`FAILED to migrate voucher ${v.code}:`, err.message);
                 console.error(err);
                 throw err; // Stop migration on error
            }
        }

        await client.query('COMMIT');
        console.log("✅ Migration completed successfully!");
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration failed completely:", err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
