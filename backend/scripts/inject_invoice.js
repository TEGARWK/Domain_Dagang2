const { Pool } = require('pg');
const crypto = require('crypto');
require('dotenv').config({ path: '../.env' });

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'domaindagang_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASS || '12345',
});

async function main() {
  const email = 'tegarwirakesuma44@gmail.com';
  
  try {
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) {
      console.log(`User with email ${email} not found.`);
      process.exit(1);
    }
    const userId = userRes.rows[0].id;

    // Generate Invoice ID (e.g. INV-YYYYMMDD-XXXX)
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randStr = crypto.randomBytes(3).toString('hex').toUpperCase();
    const invoiceId = `INV-${dateStr}-${randStr}`;

    console.log(`Creating invoice ${invoiceId} for user ${userId}`);

    // Create Invoice
    await pool.query(
      `INSERT INTO invoices (
        id, user_id, status, subtotal, net_amount, final_amount, total, type, due_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '1 day')`,
      [invoiceId, userId, 'UNPAID', 150000, 150000, 150000, 150000, 'DOMAIN']
    );

    // Create Invoice Item for Renewal
    await pool.query(
      `INSERT INTO invoice_items (
        invoice_id, name, description, price, unit_price, cost_price, years, action_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        invoiceId,
        'example-domain-to-renew.com',
        'Perpanjangan Domain example-domain-to-renew.com (1 Tahun)',
        150000,
        150000,
        130000,
        1,
        'renew'
      ]
    );

    console.log('Successfully injected unpaid renewal transaction.');
  } catch (error) {
    console.error('Error injecting transaction:', error);
  } finally {
    await pool.end();
  }
}

main();
