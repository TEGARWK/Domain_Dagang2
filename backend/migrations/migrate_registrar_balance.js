const db = require('../config/db');

async function migrate() {
    console.log("🚀 Starting Migration: Registrar Balance Tables...");
    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Create registrar_balances table
        console.log("Creating table: registrar_balances...");
        await client.query(`
            CREATE TABLE IF NOT EXISTS registrar_balances (
                id SERIAL PRIMARY KEY,
                registrar_name VARCHAR(50) UNIQUE NOT NULL DEFAULT 'daftarnama',
                current_balance DECIMAL(15, 2) DEFAULT 0,
                currency VARCHAR(10) DEFAULT 'IDR',
                low_balance_threshold DECIMAL(15, 2) DEFAULT 500000,
                last_sync_at TIMESTAMP NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // 2. Create registrar_mutations table
        console.log("Creating table: registrar_mutations...");
        
        // Create Type if not exists
        try {
            await client.query("CREATE TYPE mutation_type AS ENUM ('debit', 'credit', 'adjustment')");
        } catch (e) {
            // Ignore if type already exists
        }

        await client.query(`
            CREATE TABLE IF NOT EXISTS registrar_mutations (
                id SERIAL PRIMARY KEY,
                registrar_name VARCHAR(50) DEFAULT 'daftarnama',
                type mutation_type NOT NULL,
                amount DECIMAL(15, 2) NOT NULL,
                description VARCHAR(255),
                reference_id VARCHAR(100),
                balance_after DECIMAL(15, 2),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Index
        await client.query("CREATE INDEX IF NOT EXISTS idx_registrar ON registrar_mutations (registrar_name)");
        await client.query("CREATE INDEX IF NOT EXISTS idx_created_at ON registrar_mutations (created_at)");

        // 3. Seed Initial Data
        console.log("Seeding initial data...");
        // Check if exists first for idempotency
        const check = await client.query("SELECT id FROM registrar_balances WHERE registrar_name = 'daftarnama'");
        if (check.rows.length === 0) {
            await client.query(`
                INSERT INTO registrar_balances (registrar_name, current_balance, currency, low_balance_threshold)
                VALUES ('daftarnama', 0, 'IDR', 500000)
            `);
            console.log("✅ Seeded 'daftarnama' balance record.");
        } else {
            console.log("ℹ️ 'daftarnama' balance record already exists. Skipping seed.");
        }

        await client.query('COMMIT');
        console.log("✅ Migration Successful!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
