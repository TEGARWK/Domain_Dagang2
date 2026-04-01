const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

async function run() {
    const rawPassword = "password123";
    const email = "admin@example.com";
    
    try {
        console.log(`🛠 Menghasilkan hash baru untuk admin...`);
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(rawPassword, salt);
        
        console.log(`🛠 Mengupdate password admin di DB...`);
        const res = await pool.query("UPDATE users SET password = $1 WHERE email = $2", [hash, email]);
        
        if (res.rowCount > 0) {
            console.log("✅ Password admin BERHASIL diperbarui dengan hash yang valid!");
            
            // Kolaborasi verifikasi langsung
            const isMatch = bcrypt.compareSync(rawPassword, hash);
            console.log(`🔎 Verifikasi internal (match?): ${isMatch}`);
        } else {
            console.log("❌ User admin@example.com tidak ditemukan!");
        }
    } catch (err) {
        console.error("❌ Error:", err.message);
    } finally {
        pool.end();
    }
}

run();
