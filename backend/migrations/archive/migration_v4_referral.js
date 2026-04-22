const { Pool } = require("pg");
require("dotenv").config();

/**
 * MIGRASI FASE 3: Sistem Referral
 * Membuat tabel 'referral_rewards' dan 'referral_tiers'
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
        console.log("🛠️  Starting Migration Fase 3: Referral System...");
        await client.query("BEGIN");

        // --- 1. TABEL REFERRAL_TIERS ---
        console.log("--- Creating 'referral_tiers' table ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS referral_tiers (
                id SERIAL PRIMARY KEY,
                min_referrals INTEGER NOT NULL,
                reward_amount DECIMAL(12,2) NOT NULL,
                tier_name VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Seeding Tiers
        await client.query(`
            INSERT INTO referral_tiers (min_referrals, reward_amount, tier_name)
            VALUES 
                (0, 20000.00, 'Starter'),
                (5, 27500.00, 'Silver'),
                (10, 35000.00, 'Gold')
            ON CONFLICT DO NOTHING
        `);

        // --- 2. TABEL REFERRAL_REWARDS ---
        console.log("--- Creating 'referral_rewards' table ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS referral_rewards (
                id SERIAL PRIMARY KEY,
                referrer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                referee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                invoice_id VARCHAR(50) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
                reward_amount DECIMAL(12,2) NOT NULL,
                referee_discount DECIMAL(12,2) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled')),
                holding_until TIMESTAMP NOT NULL,
                activated_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // --- 3. INDEXES ---
        await client.query("CREATE INDEX IF NOT EXISTS idx_referral_rewards_status_holding ON referral_rewards(status, holding_until)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards(referrer_id)");

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
