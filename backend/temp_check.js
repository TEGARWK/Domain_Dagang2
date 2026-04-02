const { pool } = require('./config/db');

async function checkSchema() {
    try {
        console.log("--- Schema Check ---");
        
        const tables = ['invoices', 'payments', 'users', 'invoice_items'];
        
        for (const table of tables) {
            console.log(`\nChecking table: ${table}`);
            const res = await pool.query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);
            
            res.rows.forEach(row => {
                console.log(` - ${row.column_name}: ${row.data_type}`);
            });
        }
        
    } catch (err) {
        console.error("Error checking schema:", err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkSchema();
