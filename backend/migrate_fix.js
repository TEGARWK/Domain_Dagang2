const fs = require('fs');
const path = require('path');
const { pool } = require('./config/db');

async function migrate() {
    const sqlPath = path.join(__dirname, 'fix_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log("🚀 Starting database fix migration...");

    try {
        // Execute the entire SQL script
        // Note: pool.query can only execute one statement at a time in some configurations, 
        // but for a script like this it often works or we can split by semicolon.
        // Let's split by semicolon just to be safe, but simple splitting fails with functions/do blocks.
        // PostgreSQL's client.query(sql) actually supports multiple statements separated by semicolons.
        
        await pool.query(sql);
        
        console.log("✅ Tables 'payments' and 'activity_logs' created successfully (if they didn't exist).");
        console.log("✅ Indexes created successfully.");
    } catch (err) {
        console.error("❌ Migration failed:");
        console.error(err.message);
        process.exit(1);
    } finally {
        await pool.end();
        console.log("👋 Database connection closed.");
    }
}

migrate();
