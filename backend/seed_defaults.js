const db = require('./config/db');
const pool = db.pool; // Gunakan pool asli PG

const defaultSettings = {
    footer_company_name: 'Domain Dagang',
    footer_address: 'Jl. Raya Keadilan No. 45, Lantai 2, Jakarta Selatan, 12345',
    footer_support_email: 'support@domaindagang.com',
    footer_whatsapp: '081384868040',
    footer_copyright: '© 2026 Domain Dagang. All Rights Reserved.',
    footer_instagram: 'https://instagram.com/domaindagang',
    footer_youtube: 'https://youtube.com/@domaindagang',
    footer_facebook: '',
    footer_tiktok: '',
    footer_x: ''
};

async function seedDefaults() {
    try {
        console.log("⏳ Seeding default site settings...");
        for (const [key, value] of Object.entries(defaultSettings)) {
            const res = await pool.query(
                `INSERT INTO site_settings (setting_key, setting_value) 
                 VALUES ($1, $2) 
                 ON CONFLICT (setting_key) 
                 DO UPDATE SET setting_value = $2
                 RETURNING *`,
                [key, value]
            );
            console.log(`✅ ${key} -> ${res.rows[0].setting_value}`);
        }
        console.log("🚀 ALL SETTINGS UPDATED SUCCESSFULLY!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Error seeding site settings:", err.message);
        process.exit(1);
    }
}

seedDefaults();
