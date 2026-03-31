const db = require('../config/db');
const DaftarnamaService = require('../services/DaftarnamaService');

async function fixExpiredDates() {
    try {
        console.log("🔍 Fetching active domains with null expiration_date...");
        const { rows: domains } = await db.pool.query("SELECT id, domain_name FROM domains WHERE status = 'active' AND expiration_date IS NULL");
        
        console.log(`Found ${domains.length} domains to fix.`);

        for (const dom of domains) {
            console.log(`📡 Syncing ${dom.domain_name}...`);
            try {
                const info = await DaftarnamaService.getDomainInfo(dom.domain_name);
                if (info && info.data && info.data.expiry_date) {
                    const expiryDate = info.data.expiry_date;
                    await db.pool.query(
                        "UPDATE domains SET expiration_date = $1, last_sync_at = NOW(), updated_at = NOW() WHERE id = $2",
                        [expiryDate, dom.id]
                    );
                    console.log(`✅ Fixed ${dom.domain_name}: ${expiryDate}`);
                } else {
                    console.warn(`⚠️ No expiry_date found for ${dom.domain_name}`);
                }
            } catch (err) {
                console.error(`❌ Failed to sync ${dom.domain_name}:`, err.message);
            }
        }

        console.log("🏁 Fix cycle completed.");
    } catch (e) {
        console.error("Critical Error:", e);
    } finally {
        process.exit();
    }
}

fixExpiredDates();
