const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

async function run() {
    const email = "admin@example.com";
    
    try {
        console.log(`🔍 Mengecek data untuk: ${email}...`);
        const res = await pool.query("SELECT id, email, name, role, is_verified, password FROM users WHERE email = $1", [email]);
        if (res.rows.length > 0) {
            const user = res.rows[0];
            console.log("✅ User ditemukan:");
            console.log(JSON.stringify({
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                is_verified: user.is_verified,
                password_hash: user.password
            }, null, 2));
            
            // Test bcrypt directly
            const bcrypt = require('bcryptjs');
            const isMatch = bcrypt.compareSync('password123', user.password);
            console.log(`🔎 Test bcrypt.compareSync('password123', hash): ${isMatch}`);
            
        } else {
            console.log("❌ User tidak ditemukan!");
        }
    } catch (err) {
        console.error("❌ Error saat query database:", err.message);
    } finally {
        pool.end();
    }
}

run();
