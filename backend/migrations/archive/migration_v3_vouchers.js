const { Pool } = require("pg");
require("dotenv").config();

/**
 * MIGRASI FASE 2: Sistem Voucher (Flash Sale)
 * Membuat tabel 'vouchers' dan 'voucher_claims'
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
        console.log("🛠️  Starting Migration Fase 2: Vouchers...");
        await client.query("BEGIN");

        // --- 1. TABEL VOUCHERS ---
        console.log("--- Creating 'vouchers' table ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS vouchers (
                id SERIAL PRIMARY KEY,
                code VARCHAR(50) UNIQUE NOT NULL,
                discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
                discount_value DECIMAL(12,2) NOT NULL,
                quota INTEGER NOT NULL,
                quota_used INTEGER DEFAULT 0,
                max_use_per_user INTEGER DEFAULT 1,
                applicable_to JSONB,
                min_transaction DECIMAL(12,2) DEFAULT 0,
                started_at TIMESTAMP NOT NULL,
                expired_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT true,
                created_by INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // --- 2. TABEL VOUCHER_CLAIMS ---
        console.log("--- Creating 'voucher_claims' table ---");
        await client.query(`
            CREATE TABLE IF NOT EXISTS voucher_claims (
                id SERIAL PRIMARY KEY,
                voucher_id INTEGER REFERENCES vouchers(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                invoice_id VARCHAR(50) REFERENCES invoices(id),
                claimed_at TIMESTAMP DEFAULT NOW(),
                used_at TIMESTAMP,
                status VARCHAR(20) DEFAULT 'claimed' CHECK (status IN ('claimed', 'used', 'expired')),
                UNIQUE(voucher_id, user_id)
            )
        `);

        // --- 3. INDEXES ---
        await client.query("CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_vouchers_active_time ON vouchers(is_active, started_at, expired_at)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_voucher_claims_user_status ON voucher_claims(user_id, status)");

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
