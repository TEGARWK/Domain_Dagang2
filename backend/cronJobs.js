const cron = require('node-cron');
const referralService = require('./services/referralService');
const voucherService = require('./services/VoucherService');

/**
 * CRON JOBS SYSTEM
 * Menangani tugas otomatis berkala untuk Sistem Referral dan Voucher.
 */

const initCronJobs = () => {
    console.log("⏰ [Cron] Initializing scheduled tasks...");

    // 1. Setiap Jam (Menit 0): Aktivasi Pending Referral Rewards
    cron.schedule('0 * * * *', async () => {
        const start = new Date();
        console.log(`⏰ [${start.toISOString()}] [CRON] Starting: activatePendingRewards`);
        try {
            await referralService.activatePendingRewards();
            console.log(`✅ [${new Date().toISOString()}] [Cron] activatePendingRewards completed.`);
        } catch (err) {
            console.error(`❌ [${new Date().toISOString()}] [Cron] activatePendingRewards FAILED:`, err.message);
        }
    });

    // 2. Setiap 5 Menit: Process Failed Activation Retries
    cron.schedule('*/5 * * * *', async () => {
        const start = new Date();
        console.log(`⏰ [${start.toISOString()}] [CRON] Starting: processActivationRetries`);
        try {
            const ActivationRetryService = require('./services/ActivationRetryService');
            const result = await ActivationRetryService.processPendingRetries();
            if (result.processed > 0) {
                console.log(`✅ [${new Date().toISOString()}] [Cron] processActivationRetries: Processed ${result.processed}, Success: ${result.success}, Failed: ${result.failed}`);
            }
        } catch (err) {
            console.error(`❌ [${new Date().toISOString()}] [Cron] processActivationRetries FAILED:`, err.message);
        }
    });

    // 3. Setiap Jam (Menit 15): Expire Unused Voucher Claims
    cron.schedule('15 * * * *', async () => {
        const start = new Date();
        console.log(`⏰ [${start.toISOString()}] [CRON] Starting: expireUnusedVoucherClaims`);
        try {
            // Kita gunakan VoucherService yang sudah ada atau logic DB langsung
            const db = require('./config/db');
            const res = await db.pool.query(`
                UPDATE voucher_claims vc
                SET status = 'expired'
                FROM vouchers v
                WHERE vc.voucher_id = v.id
                AND vc.status = 'claimed'
                AND v.expired_at < NOW()
            `);
            console.log(`✅ [${new Date().toISOString()}] [Cron] expireUnusedVoucherClaims: Updated ${res.rowCount || 0} claims.`);
        } catch (err) {
            console.error(`❌ [${new Date().toISOString()}] [Cron] expireUnusedVoucherClaims FAILED:`, err.message);
        }
    });

    console.log("✅ [Cron] All tasks scheduled.");
};

module.exports = { initCronJobs };
