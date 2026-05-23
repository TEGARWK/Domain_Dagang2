const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log("🚀 Starting Finance Phase 1 Migration...");
    
    const sqlPath = path.join(__dirname, '../migrations/20260512_finance_phase1_domain.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    try {
        await pool.query(sql);
        console.log("✅ Phase 1 Migration successful! Tables and relations updated.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:");
        console.error(err.message);
        process.exit(1);
    }
}

migrate();
