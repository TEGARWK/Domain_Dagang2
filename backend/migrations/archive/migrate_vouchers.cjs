const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        console.log("Running migration...");
        await pool.query(`
            ALTER TABLE vouchers 
            ADD COLUMN IF NOT EXISTS title VARCHAR(255),
            ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255),
            ADD COLUMN IF NOT EXISTS banner_image TEXT,
            ADD COLUMN IF NOT EXISTS description TEXT,
            ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT false,
            ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS segment VARCHAR(50) DEFAULT 'all'
        `);
        console.log("✅ Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration FAILED:", err.message);
        process.exit(1);
    }
}

run();
