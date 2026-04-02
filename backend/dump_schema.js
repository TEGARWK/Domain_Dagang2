const { pool } = require('./config/db');
const fs = require('fs');

async function dumpSchema() {
    try {
        console.log("Dumping full schema info...");
        const res = await pool.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public'
            ORDER BY table_name, ordinal_position;
        `);
        
        fs.writeFileSync('full_schema_dump.json', JSON.stringify(res.rows, null, 2));
        console.log("Schema dumped to full_schema_dump.json");
    } catch (err) {
        console.error("Dump Error:", err.message);
    } finally {
        await pool.end();
        process.exit();
    }
}

dumpSchema();
