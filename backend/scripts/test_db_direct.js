const db = require('../config/db');

async function testQuery() {
    try {
        console.log("Testing payment_gateways query...");
        const res = await db.pool.query("SELECT * FROM payment_gateways WHERE provider = $1 AND is_active = true", ['prismalink']);
        console.log("Query Success! Count:", res.rows.length);
        if (res.rows.length > 0) {
            console.log("First Row Provider:", res.rows[0].provider);
        }
    } catch (err) {
        console.error("Query Failed:", err.message);
    } finally {
        process.exit(0);
    }
}

testQuery();
