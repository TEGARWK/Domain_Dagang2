const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function auditSchema() {
  try {
    const tables = ['audit_logs', 'payment_gateways', 'transfer_requests', 'invoices'];
    for (const table of tables) {
      console.log(`\n--- Schema for ${table} ---`);
      const res = await pool.query(`
        SELECT column_name, data_type, is_nullable, column_default 
        FROM information_schema.columns 
        WHERE table_name = $1 AND table_schema = 'public'
        ORDER BY ordinal_position
      `, [table]);
      res.rows.forEach(row => {
        console.log(`${row.column_name}: ${row.data_type} (Nullable: ${row.is_nullable}, Default: ${row.column_default})`);
      });
    }
  } catch (err) {
    console.error("Error auditing schema:", err);
  } finally {
    await pool.end();
  }
}

auditSchema();
