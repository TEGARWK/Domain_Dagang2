require('dotenv').config();
const { query } = require('./config/db');
const bcrypt = require('bcryptjs');

async function main() {
    const users = [
        { email: 'admin@aplikasidagang.co.id', password: 'AgamAsep#2026', name: 'Admin Agam' },
        { email: 'tegar@aplikasidagang.com', password: 'Cigadung#52!', name: 'Admin Tegar' }
    ];

    for (const u of users) {
        console.log(`\nMemproses: ${u.email}`);
        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(u.password, salt);
        try {
            const existing = await query('SELECT id FROM users WHERE email = $1', [u.email]);
            if (existing && existing.length > 0) {
                console.log(`  >> User ada (ID: ${existing[0].id}). Update password & role...`);
                await query('UPDATE users SET password=$1, role=$2, is_verified=$3, name=$4 WHERE id=$5',
                    [hashedPassword, 'admin', true, u.name, existing[0].id]);
                console.log(`  >> Update berhasil.`);
            } else {
                console.log(`  >> User belum ada. Membuat baru...`);
                await query(
                    'INSERT INTO users (name, email, password, role, is_verified, country) VALUES ($1, $2, $3, $4, $5, $6)',
                    [u.name, u.email, hashedPassword, 'admin', true, 'ID']
                );
                console.log(`  >> Berhasil dibuat.`);
            }
        } catch (error) {
            console.error(`  >> ERROR untuk ${u.email}:`, error.message);
        }
    }

    // Verifikasi hasil
    console.log('\n--- Verifikasi Users Admin ---');
    const allAdmins = await query("SELECT id, name, email, role, is_verified FROM users WHERE role='admin'");
    allAdmins.forEach(u => console.log(`  [ID:${u.id}] ${u.name} | ${u.email} | admin=${u.is_verified}`));

    process.exit(0);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
