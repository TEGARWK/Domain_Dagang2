const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '12345',
  database: process.env.DB_NAME || 'domaindagang_db',
  port: process.env.DB_PORT || 5432,
});

async function run() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log("Adding tripay_reference to payments...");
    await client.query(`
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS tripay_reference VARCHAR(100);
    `);

    console.log("Adding pay_url to payments...");
    await client.query(`
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS pay_url TEXT;
    `);

    console.log("Inserting Tripay gateway config...");
    const methods = ["VA", "QRIS", "EWALLET"];
    const banks = {
        "VA": ["BCAVA", "BRIVA", "BNIVA", "MANDIRIVA", "PERMATAVA", "CIMBVA", "BNCVA"],
        "QRIS": ["QRIS", "QRISC"],
        "EWALLET": ["OVO", "DANA", "SHOPEEPAY"]
    };
    
    const insertSql = `
        INSERT INTO payment_gateways 
            (bank_name, account_number, account_holder, provider, is_active, mode, enabled_methods, enabled_banks, instructions)
        VALUES 
            ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT DO NOTHING
    `;
    
    // There is no unique constraint on provider natively unless added, but let's just do a check
    const check = await client.query(`SELECT id FROM payment_gateways WHERE provider = 'tripay'`);
    if (check.rows.length === 0) {
        await client.query(insertSql, [
            'Tripay', 
            '0', 
            'SYSTEM', 
            'tripay', 
            true, 
            'sandbox', 
            JSON.stringify(methods), 
            JSON.stringify(banks), 
            'Pembayaran Otomatis Tripay'
        ]);
        console.log("Tripay config inserted.");
    } else {
        console.log("Tripay config already exists.");
    }

    await client.query('COMMIT');
    console.log("Migration completed successfully!");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
