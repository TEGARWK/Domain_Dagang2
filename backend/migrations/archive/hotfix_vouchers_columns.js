const db = require('../config/db');

const up = async () => {
    const client = await db.pool.connect();
    try {
        console.log("🚀 Menjalankan Hotfix: Sinkronisasi kolom tabel 'vouchers'...");
        await client.query('BEGIN');

        // Tambahkan kolom baru ke vouchers
        await client.query(`
            ALTER TABLE vouchers 
            ADD COLUMN IF NOT EXISTS eligible_tlds JSONB DEFAULT '[]',
            ADD COLUMN IF NOT EXISTS eligible_actions JSONB DEFAULT '["register"]',
            ADD COLUMN IF NOT EXISTS is_stackable BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS is_new_user_only BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS max_discount DECIMAL(15,2) DEFAULT 0,
            ADD COLUMN IF NOT EXISTS is_automatic BOOLEAN DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS end_date TIMESTAMP WITH TIME ZONE,
            ADD COLUMN IF NOT EXISTS usage_limit_per_user INT DEFAULT 1,
            ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0,
            ADD COLUMN IF NOT EXISTS segment VARCHAR(50) DEFAULT 'all';
        `);

        await client.query('COMMIT');
        console.log("✅ Hotfix berhasil! Skema tabel 'vouchers' sudah tersinkronisasi.");
        process.exit(0);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("❌ Hotfix Gagal:", error);
        process.exit(1);
    } finally {
        client.release();
    }
};

up();
