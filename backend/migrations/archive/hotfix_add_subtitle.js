const db = require('../config/db');

const up = async () => {
    const client = await db.pool.connect();
    try {
        console.log("🚀 Menjalankan Hotfix: Menambahkan kolom 'subtitle' ke tabel 'vouchers'...");
        await client.query('BEGIN');

        // Tambahkan kolom subtitle jika belum ada
        await client.query(`
            ALTER TABLE vouchers 
            ADD COLUMN IF NOT EXISTS subtitle VARCHAR(255);
        `);

        await client.query('COMMIT');
        console.log("✅ Hotfix berhasil! Kolom 'subtitle' sudah siap digunakan.");
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
