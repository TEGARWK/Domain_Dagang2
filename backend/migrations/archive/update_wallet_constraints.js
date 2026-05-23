const db = require('../config/db');

async function migrate() {
    const client = await db.pool.connect();
    try {
        console.log("🚀 Updating Wallet Constraints...");

        await client.query('BEGIN');

        // 1. Drop existing constraint
        try {
            await client.query(`
                ALTER TABLE wallet_transactions 
                DROP CONSTRAINT IF EXISTS wallet_transactions_reference_type_check;
            `);
            console.log("✅ Dropped old constraint.");
        } catch (e) {
            console.log("⚠️  Could not drop constraint (might not exist or different name):", e.message);
        }

        // 2. Add new constraint with new types
        await client.query(`
            ALTER TABLE wallet_transactions 
            ADD CONSTRAINT wallet_transactions_reference_type_check 
            CHECK (reference_type IN ('TOPUP', 'PAYMENT', 'REFUND', 'RENEWAL', 'ADJUSTMENT', 'WITHDRAW_HOLD', 'WITHDRAW_REFUND', 'WITHDRAW_REJECT'));
        `);
        console.log("✅ Added new constraint with WITHDRAW types.");

        await client.query('COMMIT');
        console.log("🎉 Constraint Update Complete!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Migration Failed:", err);
    } finally {
        client.release();
        process.exit();
    }
}

migrate();
