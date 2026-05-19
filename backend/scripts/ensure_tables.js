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
        `CREATE TABLE IF NOT EXISTS support_tickets (
            id SERIAL PRIMARY KEY,
            user_id INT REFERENCES users(id) ON DELETE SET NULL,
            subject VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            status VARCHAR(50) DEFAULT 'open',
            priority VARCHAR(20) DEFAULT 'medium',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );`,
        `CREATE TABLE IF NOT EXISTS ticket_replies (
            id SERIAL PRIMARY KEY,
            ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
            user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            message TEXT NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            attachments JSONB DEFAULT '[]',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

        // --- site_settings: key-value store untuk konfigurasi global ---
        await pool.query(`
            CREATE TABLE IF NOT EXISTS site_settings (
                id SERIAL PRIMARY KEY,
                setting_key VARCHAR(100) NOT NULL UNIQUE,
                setting_value TEXT,
                setting_group VARCHAR(50) DEFAULT 'general',
                label VARCHAR(255),
                description TEXT,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        `);

        // Seed data default untuk footer jika belum ada
        const defaultSettings = [
            { key: 'footer_company_name',  value: 'PT. Aplikasi Dagang Teknologi', group: 'footer', label: 'Nama Perusahaan' },
            { key: 'footer_address',       value: 'Jl. Cigadung Raya Tengah No.52, RT.2, Cigadung, Kec. Cibeunying Kaler, Kota Bandung, Jawa Barat 40191', group: 'footer', label: 'Alamat Kantor' },
            { key: 'footer_support_email', value: 'support@domaindagang.com', group: 'footer', label: 'Email Support (Internal)' },
            { key: 'footer_whatsapp',      value: '081384868040', group: 'footer', label: 'WhatsApp CS (Internal)' },
            { key: 'footer_copyright',     value: '© 2026 PT. Aplikasi Dagang Teknologi. All rights reserved.', group: 'footer', label: 'Teks Copyright' },
            { key: 'footer_instagram',     value: 'https://instagram.com/Jasaweb_pro', group: 'social', label: 'Instagram URL' },
            { key: 'footer_youtube',       value: 'https://youtube.com/@aplikasidagang', group: 'social', label: 'YouTube URL' },
            { key: 'footer_facebook',      value: 'https://facebook.com/aplikasidagang', group: 'social', label: 'Facebook URL' },
            { key: 'footer_tiktok',        value: 'https://tiktok.com/@aplikasidagang', group: 'social', label: 'TikTok URL' },
            { key: 'footer_x',             value: 'https://x.com/aplikasidagang', group: 'social', label: 'X (Twitter) URL' },
        ];

        // Konversi setting_value dari JSONB ke TEXT jika perlu (untuk kompatibilitas)
        try {
            await pool.query(`
                DO $$
                BEGIN
                  IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'site_settings'
                      AND column_name = 'setting_value'
                      AND data_type = 'jsonb'
                  ) THEN
                    ALTER TABLE site_settings ALTER COLUMN setting_value TYPE TEXT USING setting_value::TEXT;
                  END IF;
                END
                $$
            `);
        } catch(e) { console.warn("⚠️  setting_value conversion skipped:", e.message); }

        // Seed data default untuk footer jika belum ada
        for (const s of defaultSettings) {
            try {
                await pool.query(
                    `INSERT INTO site_settings (setting_key, setting_value, setting_group, label)
                     VALUES ($1, $2, $3, $4)
                     ON CONFLICT (setting_key) DO NOTHING`,
                    [s.key, s.value, s.group, s.label]
                );
            } catch(e) { console.warn(`⚠️  Seed skip [${s.key}]:`, e.message); }
        }

        console.log("💎 Schema verification complete!");

    } catch (err) {
        console.error("❌ Fatal Error during schema fix:", err.message);
    } finally {
        await pool.end();
    }
}

run();
