const db = require('../config/db');

async function migrate() {
    const client = await db.pool.connect();
    try {
        console.log("🚀 Starting Migration: Add payout_ref to withdrawal_requests...");

        await client.query('BEGIN');

        // Check if column exists
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='withdrawal_requests' AND column_name='payout_ref'
        `);

        if (res.rows.length === 0) {
            await client.query(`
                ALTER TABLE withdrawal_requests 
                ADD COLUMN payout_ref VARCHAR(100) DEFAULT NULL
            `);
            console.log("✅ Column 'payout_ref' added.");
        } else {
            console.log("ℹ️  Column 'payout_ref' already exists.");
        }

        await client.query('COMMIT');
        console.log("🎉 Migration Complete!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
