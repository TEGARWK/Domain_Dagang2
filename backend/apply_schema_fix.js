const db = require('./config/db');

async function applyFixes() {
    try {
        console.log("🚀 Starting database schema fixes...");

        // 1. Add missing columns to audit_logs
        console.log("Checking audit_logs columns...");
        await db.pool.query(`
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS old_value JSONB;
            ALTER TABLE audit_logs ADD COLUMN IF NOT EXISTS new_value JSONB;
        `);
        console.log("✅ audit_logs columns verified/added.");

        // 2. Create faqs table if missing
        console.log("Checking faqs table...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS faqs (
                id SERIAL PRIMARY KEY,
                question TEXT NOT NULL,
                answer TEXT NOT NULL,
                category VARCHAR(50),
                is_active BOOLEAN DEFAULT TRUE,
                priority INT DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log("✅ faqs table verified/created.");

        // 3. Create pricing table if missing
        console.log("Checking pricing table...");
        await db.pool.query(`
            CREATE TABLE IF NOT EXISTS pricing (
                id SERIAL PRIMARY KEY,
                tld VARCHAR(20) NOT NULL UNIQUE,
                price_register DECIMAL(15, 2) NOT NULL DEFAULT 0,
                price_renew DECIMAL(15, 2) NOT NULL DEFAULT 0,
                price_transfer DECIMAL(15, 2) NOT NULL DEFAULT 0,
                price_restore DECIMAL(15, 2) NOT NULL DEFAULT 0,
                cost_register DECIMAL(15, 2) NOT NULL DEFAULT 0,
                cost_renew DECIMAL(15, 2) NOT NULL DEFAULT 0,
                cost_transfer DECIMAL(15, 2) NOT NULL DEFAULT 0,
                cost_restore DECIMAL(15, 2) NOT NULL DEFAULT 0,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log("✅ pricing table verified/created.");

        // 4. Seed basic data if empty
        const faqCount = await db.pool.query("SELECT count(*) FROM faqs");
        if (parseInt(faqCount.rows[0].count) === 0) {
            console.log("Seeding initial FAQs...");
            await db.pool.query(`
                INSERT INTO faqs (question, answer, category) VALUES
                ('Bagaimana cara transfer domain?', 'Anda cukup menyiapkan EPP Code dan memastikan domain tidak di-lock.', 'Domain'),
                ('Apa itu Dagang Domain?', 'Platform reseller domain dengan API otomatis.', 'Umum');
            `);
        }

        console.log("✨ All database fixes applied successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error applying fixes:", err.message);
        process.exit(1);
    }
}

applyFixes();
