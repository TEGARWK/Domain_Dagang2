const { pool } = require('./config/db');

async function checkSchema() {
    try {
        console.log("--- Comprehensive Schema Check ---");
        
        const tables = ['invoices', 'payments', 'users', 'audit_logs'];
        
        for (const table of tables) {
            console.log(`\nTable Schema: ${table}`);
            const res = await pool.query(`
                SELECT 
                    f.column_name, 
                    f.data_type, 
                    f.is_nullable,
                    (SELECT 'YES' FROM information_schema.table_constraints tc 
                     JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name 
                     WHERE tc.table_name = f.table_name AND kcu.column_name = f.column_name AND tc.constraint_type = 'PRIMARY KEY') as is_pk
                FROM information_schema.columns f
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [table]);
            
            console.table(res.rows);
        }
        
    } catch (err) {
        console.error("Error checking schema:", err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

checkSchema();
