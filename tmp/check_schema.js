const db = require('./backend/config/db');
async function checkSchema() {
    try {
        const res = await db.pool.query("SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name = 'audit_logs'");
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
checkSchema();
