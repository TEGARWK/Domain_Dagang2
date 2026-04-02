const { pool } = require('./config/db');
const fs = require('fs');

async function checkSchema() {
    try {
        console.log("--- Comprehensive Schema Check ---");
        const tables = ['invoices', 'payments', 'users', 'audit_logs'];
        let results = {};

        for (const table of tables) {
            const res = await pool.query(`
                SELECT 
                    column_name, 
                    data_type, 
                    is_nullable
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);
            results[table] = res.rows;
        }

        fs.writeFileSync('schema_data.json', JSON.stringify(results, null, 2));
        console.log("Schema data written to schema_data.json");
    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkSchema();
