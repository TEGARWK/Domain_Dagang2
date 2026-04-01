const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
  connectionTimeoutMillis: 5000, 
});

async function testConnection() {
  console.log("🔍 Mengetes koneksi ke:", process.env.DB_HOST);
  try {
    const client = await pool.connect();
    console.log("✅ Berhasil terhubung ke database!");
    const res = await client.query('SELECT NOW()');
    console.log("🕒 Waktu Server Database:", res.rows[0].now);
    client.release();
  } catch (err) {
    console.error("❌ Gagal terhubung ke database!");
    console.error("Pesan Error:", err.message);
    if (err.message.includes('ETIMEDOUT')) {
      console.log("💡 Tips: Pastikan VPN kamu sudah aktif dan kamu punya akses ke host tersebut.");
    }
  } finally {
    await pool.end();
  }
}

testConnection();
