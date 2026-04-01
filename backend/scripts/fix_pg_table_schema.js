const db = require('../config/db');

async function fixPaymentGatewayTable() {
    try {
        console.log("Checking payment_gateways table structure...");
        
        // 1. Add missing columns to support PrismaLink / Automated Gateways
        // We'll use a transaction for safety
        await db.pool.query('BEGIN');

        console.log("Altering table to add automated gateway columns...");
        
        // Check if provider column exists first to avoid double error
        const checkCol = await db.pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'payment_gateways' AND column_name = 'provider'
        `);

        if (checkCol.rows.length === 0) {
            await db.pool.query(`
                ALTER TABLE payment_gateways 
                ADD COLUMN IF NOT EXISTS provider VARCHAR(50) UNIQUE,
                ADD COLUMN IF NOT EXISTS mode VARCHAR(20) DEFAULT 'sandbox',
                ADD COLUMN IF NOT EXISTS enabled_methods JSONB DEFAULT '[]',
                ADD COLUMN IF NOT EXISTS enabled_banks JSONB DEFAULT '{}',
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            `);
            console.log("Columns added successfully.");
        } else {
            console.log("Provider column already exists.");
        }

        // 2. Insert Default PrismaLink Config if not exists
        console.log("Seeding PrismaLink configuration...");
        await db.pool.query(`
            INSERT INTO payment_gateways (provider, is_active, mode, enabled_methods, enabled_banks, instructions, bank_name, account_number, account_holder)
            VALUES (
                'prismalink', 
                true, 
                'sandbox', 
                '["VA", "QRIS"]', 
                '{"VA": ["BCA", "BNI", "BRI", "MANDIRI"], "QRIS": ["QRIS"]}', 
                'Pembayaran Otomatis via PrismaLink',
                'PLink', '0', 'SYSTEM'
            )
            ON CONFLICT (provider) DO NOTHING;
        `);
        console.log("PrismaLink config seeded.");

        await db.pool.query('COMMIT');
        console.log("Migration completed successfully!");

    } catch (err) {
        await db.pool.query('ROLLBACK');
        console.error("Migration FAILED:", err.message);
    } finally {
        process.exit(0);
    }
}

fixPaymentGatewayTable();
