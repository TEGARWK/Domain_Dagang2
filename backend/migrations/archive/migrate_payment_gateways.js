const { pool } = require('../config/db');

async function migrate() {
  const createTableSql = `
    CREATE TABLE IF NOT EXISTS payment_gateways (
        id SERIAL PRIMARY KEY,
        bank_name VARCHAR(100) NOT NULL,
        account_number VARCHAR(100) NOT NULL,
        account_holder VARCHAR(100) NOT NULL,
        logo_url VARCHAR(255),
        is_active BOOLEAN DEFAULT TRUE,
        instructions TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  const seedSql = `
    INSERT INTO payment_gateways (bank_name, account_number, account_holder, is_active, instructions)
    VALUES 
    ('Bank BCA', '1234567890', 'PT Dagang Domain', true, 'Transfer via ATM, M-Banking, atau Internet Banking.'),
    ('Bank Mandiri', '0987654321', 'PT Dagang Domain', true, 'Transfer via Mandiri Online atau ATM.'),
    ('GoPay', '08123456789', 'Dagang Domain', true, 'Scan QRIS atau transfer manuall ke nomor HP.')
    ON CONFLICT DO NOTHING; -- Note: This works only if there's a unique constraint, but given it's a fresh migration script it's fine for now or we check existence first.
  `;

  try {
    console.log('Creating payment_gateways table...');
    await pool.query(createTableSql);
    console.log('✅ Table created.');

    console.log('Seeding default data...');
    // Simple check to avoid duplicates if running multiple times without unique constraint on bank_name
    const check = await pool.query('SELECT COUNT(*) FROM payment_gateways');
    if (parseInt(check.rows[0].count) === 0) {
        await pool.query(seedSql);
        console.log('✅ Default data seeded.');
    } else {
        console.log('ℹ️ Data already exists, skipping seed.');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    process.exit();
  }
}

migrate();
