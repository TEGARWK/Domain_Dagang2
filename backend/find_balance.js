const { pool } = require('./config/db');

async function findTable() {
    try {
        console.log("--- Tables in public schema ---");
        const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        console.log(res.rows.map(r => r.table_name).join(', '));
        
        console.log("\n--- Searching for 'balance', 'saldo', 'credit' columns ---");
        const res2 = await pool.query(`
            SELECT table_name, column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND (column_name LIKE '%balance%' OR column_name LIKE '%saldo%' OR column_name LIKE '%credit%' OR column_name LIKE '%wallet%');
        `);
        console.table(res2.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
        process.exit();
    }
}

findTable();
