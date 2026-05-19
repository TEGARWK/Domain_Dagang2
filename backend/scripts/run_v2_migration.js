const { pool } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function migrate() {
    console.log("🚀 Starting Finance V2 Migration...");
    
    const sqlPath = path.join(__dirname, '../migrations/20240504_finance_v2.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Split by ';' but handle triggers (which contain ;)
    // For simplicity, we'll split by a more robust way or just run the whole block
    // Postgres pool.query can handle multiple statements if separated by semicolon
    
    try {
        await pool.query(sql);
        console.log("✅ Migration successful! All tables and triggers created.");
        
        // Initial Data for Categories if empty
        const { rows } = await pool.query("SELECT COUNT(*) FROM saving_categories");
        if (parseInt(rows[0].count) === 0) {
            console.log("📦 Inserting initial categories...");
            await pool.query(`
                INSERT INTO saving_categories (name, percentage, sort_order) VALUES 
                ('Operasional', 10.00, 1),
                ('Pajak', 0.00, 2),
                ('Zakat', 2.50, 3)
            `);
        }

        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:");
        console.error(err.message);
        process.exit(1);
    }
}

migrate();
