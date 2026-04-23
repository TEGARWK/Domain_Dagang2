const { getData } = require('idn-area-data');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 5432,
});

async function seed() {
    const client = await pool.connect();
    try {
        console.log("🚀 Starting Region Seeding (Indonesia)...");
        
        // 1. Get Data from idn-area-data
        const provinces = await getData('provinces');
        const regencies = await getData('regencies');
        // Optional: Districts and Villages (might be too many for a quick seed)
        // const districts = await getData('districts');
        
        console.log(`- Found ${provinces.length} Provinces`);
        console.log(`- Found ${regencies.length} Regencies`);

        await client.query('BEGIN');

        // 2. Insert Provinces
        console.log("Inserting Provinces...");
        for (const p of provinces) {
            await client.query(
                "INSERT INTO regions (id, name, type, parent_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
                [p.code, p.name, 'PROVINCE', null]
            );
        }

        // 3. Insert Regencies
        console.log("Inserting Regencies...");
        for (const r of regencies) {
            await client.query(
                "INSERT INTO regions (id, name, type, parent_id) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name",
                [r.code, r.name, 'REGENCY', r.province_code]
            );
        }

        await client.query('COMMIT');
        console.log("✅ Seeding completed successfully!");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("❌ Seeding failed:", err.message);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();
