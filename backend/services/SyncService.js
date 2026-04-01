const db = require('../config/db');
const DaftarnamaService = require('./DaftarnamaService');
const DomainLoggingService = require('./DomainLoggingService');

class SyncService {
    /**
     * Sinkronisasi massal dari daftar nama domain eksternal.
     * Karena API Daftarnama tidak menyediakan bulk-list, Admin
     * akan mengirimkan array string nama domain.
     * @param {string[]} domainNames 
     * @returns {Promise<Object>}
     */
    async syncManualList(domainNames) {
        let successCount = 0;
        let failedList = [];

        // Akun Target (Office / Aplikasi Dagang)
        const targetUserId = 3; 

        for (const domain of domainNames) {
            try {
                const response = await DaftarnamaService.getDomainInfo(domain);
                
                if (!response || !response.data) {
                    failedList.push({ domain, reason: 'Data tidak ditemukan di registrar' });
                    continue;
                }

                const info = response.data;
                const status = (info.status || 'unknown').toLowerCase();
                const expiryDate = info.expiry_date || null;
                const ns = JSON.stringify(info.nameservers || []);

                const checkSql = "SELECT id, status FROM domains WHERE domain_name = $1";
                const existing = await db.query(checkSql, [domain]);

                if (existing && existing.length > 0) {
                    // Update yang sudah ada
                    const updateSql = `
                        UPDATE domains 
                        SET status = $1, expiration_date = $2, nameservers = $3, user_id = $4, updated_at = NOW() 
                        WHERE id = $5
                    `;
                    await db.query(updateSql, [status, expiryDate, ns, targetUserId, existing[0].id]);
                    await DomainLoggingService.log(existing[0].id, existing[0].status, status, "Sistem memperbarui via bulk sync", null, domain, { type: "BATCH_SYNC_UPDATE" });
                } else {
                    // Insert baru
                    const insertSql = `
                        INSERT INTO domains (user_id, domain_name, status, expiration_date, nameservers, created_at, updated_at)
                        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                        RETURNING id
                    `;
                    const res = await db.query(insertSql, [targetUserId, domain, status, expiryDate, ns]);
                    await DomainLoggingService.log(res[0].id, null, status, "Domain diimpor via bulk sync admin", null, domain, { type: "BATCH_SYNC_INSERT" });
                }
                
                successCount++;
            } catch (err) {
                console.error(`[SyncService] Gagal sinkronisasi ${domain}:`, err.response ? JSON.stringify(err.response.data) : err.message);
                failedList.push({ domain, reason: err.message });
            }
        }

        return { 
            total_processed: domainNames.length, 
            success: successCount, 
            failed: failedList 
        };
    }
}

module.exports = new SyncService();
