const { query } = require('./backend/config/db');

async function checkSchema() {
    try {
        const res = await query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'transfer_requests'
        `);
        console.log("Columns in transfer_requests:", res.map(c => c.column_name));
    } catch (err) {
        console.error("Error checking schema:", err);
    }
    process.exit(0);
}

checkSchema();
