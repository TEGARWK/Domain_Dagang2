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
    
    console.log("Adding transaction_type to payments...");
    // use varchar for type tracking -> 'order' or 'topup'
    await client.query(`
        ALTER TABLE payments 
        ADD COLUMN IF NOT EXISTS transaction_type VARCHAR(20) DEFAULT 'order';
    `);

    // Ensure all existing invoices that are TOPUP are set correctly
    console.log("Sync existing TOPUP types...");
    await client.query(`
        UPDATE payments p
        SET transaction_type = 'topup'
        FROM invoices i
        WHERE p.invoice_number = i.id AND i.type = 'TOPUP' AND p.transaction_type = 'order';
    `);

    await client.query('COMMIT');
    console.log("Migration Phase 3 completed successfully!");
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

run();
