const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
});

async function runSql() {
  try {
    const sqlPath = path.join(__dirname, 'fix_voucher_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Executing SQL script...");
    await pool.query(sql);
    console.log("✅ Success! Vouchers and user_vouchers tables created.");
  } catch (err) {
    console.error("❌ Error executing SQL:", err);
  } finally {
    await pool.end();
  }
}

runSql();
