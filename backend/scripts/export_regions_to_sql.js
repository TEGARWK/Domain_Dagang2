/**
 * @file export_regions_to_sql.js
 * @description Script untuk mengekspor seluruh data region dari database ke file SQL
 * dengan urutan hierarki yang benar (PROVINCE -> REGENCY -> DISTRICT -> VILLAGE)
 */

const { query } = require('../config/db');
const fs = require('fs');
const path = require('path');

async function exportRegions() {
  try {
    console.log('🔄 Memulai ekspor data region dari database...');

    // Query semua data region terurut berdasarkan tipe untuk menghindari constraint error parent_id
    const sqlQuery = `
      SELECT id, name, type, parent_id 
      FROM regions 
      ORDER BY CASE type 
        WHEN 'PROVINCE' THEN 1 
        WHEN 'REGENCY' THEN 2 
        WHEN 'DISTRICT' THEN 3 
        WHEN 'VILLAGE' THEN 4 
        ELSE 5 
      END ASC, id ASC
    `;

    const rows = await query(sqlQuery);
    console.log(`📊 Ditemukan ${rows.length} data region.`);

    const outputFile = path.join(__dirname, '../all_regions.sql');
    const writeStream = fs.createWriteStream(outputFile, { encoding: 'utf8' });

    writeStream.write('-- INDONESIA REGIONS SQL EXPORT\n');
    writeStream.write('-- Total Records: ' + rows.length + '\n');
    writeStream.write('BEGIN;\n\n');

    let currentType = '';

    for (const row of rows) {
      if (row.type !== currentType) {
        currentType = row.type;
        writeStream.write(`\n-- Tipe: ${currentType}\n`);
      }

      const safeName = row.name.replace(/'/g, "''");
      const parentVal = row.parent_id ? `'${row.parent_id}'` : 'NULL';
      
      const insertLine = `INSERT INTO regions (id, name, type, parent_id) VALUES ('${row.id}', '${safeName}', '${row.type}', ${parentVal}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, type = EXCLUDED.type, parent_id = EXCLUDED.parent_id;\n`;
      
      writeStream.write(insertLine);
    }

    writeStream.write('\nCOMMIT;\n');
    writeStream.end();

    writeStream.on('finish', () => {
      console.log(`✅ File SQL berhasil dibuat di: ${outputFile}`);
      process.exit(0);
    });

  } catch (err) {
    console.error('❌ Terjadi kesalahan saat ekspor data:', err.message);
    process.exit(1);
  }
}

exportRegions();
