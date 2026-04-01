const { Pool } = require("pg");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

async function syncSchema() {
  const client = await pool.connect();
  try {
    console.log("🚀 Starting Production Database Schema Sync...");

    // 1. Create MISSING TABLES
    console.log("--- Checking Tables ---");
    
    // PAYMENTS Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
          id SERIAL PRIMARY KEY,
          invoice_number VARCHAR(100) NOT NULL,
          transaction_id VARCHAR(100) UNIQUE NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          payment_method VARCHAR(50),
          status VARCHAR(50) DEFAULT 'PENDING',
          raw_response JSONB,
          va_number VARCHAR(50),
          expired_at TIMESTAMP WITH TIME ZONE,
          plink_ref_no VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Table 'payments' ensured.");

    // ACTIVITY_LOGS Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS activity_logs (
          id SERIAL PRIMARY KEY,
          invoice_id VARCHAR(100) NOT NULL,
          action VARCHAR(255) NOT NULL,
          description TEXT,
          user_type VARCHAR(50) DEFAULT 'system',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    console.log("✅ Table 'activity_logs' ensured.");

    // 2. Add MISSING COLUMNS to existing tables
    console.log("--- Checking Columns ---");

    const addColumn = async (table, column, definition) => {
        try {
            await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`);
            console.log(`✅ Column '${column}' in table '${table}' ensured.`);
        } catch (e) {
            console.error(`❌ Error adding column ${column} to ${table}:`, e.message);
        }
    };

    // INVOICES Table
    await addColumn('invoices', 'subtotal', 'DECIMAL(15, 2) DEFAULT 0');
    await addColumn('invoices', 'total_discount', 'DECIMAL(15, 2) DEFAULT 0');
    await addColumn('invoices', 'net_amount', 'DECIMAL(15, 2) DEFAULT 0');
    await addColumn('invoices', 'tax_amount', 'DECIMAL(15, 2) DEFAULT 0');
    await addColumn('invoices', 'final_amount', 'DECIMAL(15, 2) DEFAULT 0');
    await addColumn('invoices', 'total_cost', 'DECIMAL(15, 2) DEFAULT 0');
    await addColumn('invoices', 'profit_amount', 'DECIMAL(15, 2) DEFAULT 0');
    await addColumn('invoices', 'paid_at', 'TIMESTAMP WITH TIME ZONE');
    await addColumn('invoices', 'refunded_at', 'TIMESTAMP WITH TIME ZONE');
    await addColumn('invoices', 'refund_reason', 'TEXT');

    // AUDIT_LOGS Table (Repairing previous partial fix)
    await addColumn('audit_logs', 'old_value', 'JSONB');
    await addColumn('audit_logs', 'new_value', 'JSONB');
    await addColumn('audit_logs', 'entity_type', 'VARCHAR(50)');
    await addColumn('audit_logs', 'entity_id', 'VARCHAR(100)');

    // TRANSFER_REQUESTS Table
    await addColumn('transfer_requests', 'invoice_id', 'VARCHAR(100)');

    // USERS Table (Ensure billing info)
    await addColumn('users', 'address_line1', 'TEXT');
    await addColumn('users', 'city', 'VARCHAR(100)');
    await addColumn('users', 'state', 'VARCHAR(100)');
    await addColumn('users', 'zip_code', 'VARCHAR(20)');
    await addColumn('users', 'country', "VARCHAR(100) DEFAULT 'ID'");

    console.log("\n✨ Database Sync Completed Successfully!");
    console.log("Try refreshing your dashboard now.");

  } catch (err) {
    console.error("\n❌ Critical Sync Error:", err.stack);
  } finally {
    client.release();
    await pool.end();
  }
}

syncSchema();
