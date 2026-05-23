const { getData } = require('idn-area-data');
const fs = require('fs');
const path = require('path');

async function run() {
  try {
    const provinces = await getData('provinces');
    const regencies = await getData('regencies');
    
    let sql = '-- INDONESIA REGIONS SQL SEED\n';
    sql += 'BEGIN;\n\n';
    
    sql += '-- 1. Provinces\n';
    for (const p of provinces) {
      const safeName = p.name.replace(/'/g, "''");
      sql += `INSERT INTO regions (id, name, type, parent_id) VALUES ('${p.code}', '${safeName}', 'PROVINCE', NULL) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
    }
    
    sql += '\n-- 2. Regencies\n';
    for (const r of regencies) {
      const safeName = r.name.replace(/'/g, "''");
      sql += `INSERT INTO regions (id, name, type, parent_id) VALUES ('${r.code}', '${safeName}', 'REGENCY', '${r.province_code}') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;
    }
    
    sql += '\nCOMMIT;\n';
    
    fs.writeFileSync(path.join(__dirname, '../regions_data.sql'), sql);
    console.log("SQL file generated successfully!");
  } catch (err) {
    console.error("Error generating SQL:", err.message);
  }
}
run();
