const { Pool } = require("pg");
require("dotenv").config();

/**
 * MIGRASI FASE 1: Fondasi Referral & Voucher
 * Menambahkan kolom pada tabel 'users' dan 'invoices'
 */

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
});

const migrate = async () => {
    const client = await pool.connect();
    try {
        console.log("🛠️  Starting Migration Fase 1...");
        await client.query("BEGIN");

        // --- 1. UPDATE TABEL USERS ---
        console.log("--- Updating 'users' table ---");
        
        // Add columns
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS referral_code VARCHAR(20) UNIQUE,
            ADD COLUMN IF NOT EXISTS referred_by_id INTEGER REFERENCES users(id),
            ADD COLUMN IF NOT EXISTS referral_reward_total DECIMAL(12,2) DEFAULT 0
        `);

        // Generate referral_code for existing users (NAMA-RND)
        const usersRes = await client.query("SELECT id, name FROM users WHERE referral_code IS NULL");
        console.log(`Generating referral codes for ${usersRes.rowCount} current users...`);
        
        for (let row of usersRes.rows) {
            const cleanName = (row.name || 'USER').split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '');
            const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
            const refCode = `${cleanName}-${randomStr}`;
            
            await client.query("UPDATE users SET referral_code = $1 WHERE id = $2", [refCode, row.id]);
        }

        // Set NOT NULL constraint after populating
        await client.query("ALTER TABLE users ALTER COLUMN referral_code SET NOT NULL");

        // --- 2. UPDATE TABEL INVOICES ---
        console.log("--- Updating 'invoices' table ---");
        
        await client.query(`
            ALTER TABLE invoices 
            ADD COLUMN IF NOT EXISTS original_subtotal DECIMAL(12,2),
            ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS discount_source VARCHAR(50),
            ADD COLUMN IF NOT EXISTS discount_meta JSONB
        `);

        // Add indexes for performance
        await client.query("CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_invoices_discount_source ON invoices(discount_source)");

        await client.query("COMMIT");
        console.log("✅ Migration SUCCESSFUL!");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration FAILED:", err.message);
        process.exit(1);
    } finally {
        client.release();
        process.exit(0);
    }
};

migrate();
