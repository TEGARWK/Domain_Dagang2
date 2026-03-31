const cron = require('node-cron');
const db = require('../config/db');
const DaftarnamaService = require('../services/DaftarnamaService');
const EmailService = require('../services/EmailService');



// Function to sync current transfers
const syncTransfers = async () => {

    
    const client = await db.pool.connect();
    try {
        // 1. Get Active Transfers
        const sql = `
            SELECT * FROM transfer_requests 
            WHERE status IN ('PROCESSING', 'IN_PROGRESS')
        `;
        const res = await client.query(sql);
        const activeTransfers = res.rows;

        if (activeTransfers.length === 0) {
            console.log("[TransferSyncWorker] No active transfers to sync.");
            return;
        }

        console.log(`[TransferSyncWorker] Found ${activeTransfers.length} transfers to check.`);

        // 2. Loop & Check
        for (const transfer of activeTransfers) {
            try {
                // Check Status at Registrar
                const statusData = await DaftarnamaService.getTransferStatus(transfer.domain_name);
                
                if (!statusData) {
                    console.log(`[TransferSync] No status returned for ${transfer.domain_name}`);
                    continue;
                }

                // Map Registrar Status to Local Status
                // Registrar: 'client_transfer_prohibited' (locked at old), 'pending', 'success', 'failed'
                let newStatus = transfer.status;
                let isCompleted = false;

                if (statusData.status === 'success' || statusData.status === 'ok') {
                    newStatus = 'COMPLETED';
                    isCompleted = true;
                } else if (statusData.status === 'failed' || statusData.status === 'rejected') {
                    newStatus = 'FAILED_AT_REGISTRAR';
                }

                // Update if status changed
                if (newStatus !== transfer.status) {
                    await client.query(
                        "UPDATE transfer_requests SET status = $1, updated_at = NOW(), last_check_at = NOW() WHERE id = $2",
                        [newStatus, transfer.id]
                    );
                    console.log(`[TransferSync] ${transfer.domain_name} updated to ${newStatus}`);

                    // 3. Finalize if Completed
                    if (isCompleted) {
                         // Insert to domains table
                         await client.query(`
                            INSERT INTO domains (user_id, domain_name, status, auto_renew, is_locked, created_at, updated_at)
                            VALUES ($1, $2, 'active', false, true, NOW(), NOW())
                            ON CONFLICT (domain_name) DO NOTHING
                         `, [transfer.user_id, transfer.domain_name]);

                         console.log(`[TransferSync] ${transfer.domain_name} added to user domains.`);

                         // 4. Send Email Notification
                         try {
                             const userRes = await client.query("SELECT name, email FROM users WHERE id = $1", [transfer.user_id]);
                             if (userRes.rows.length > 0) {
                                 EmailService.sendTransferSuccess(userRes.rows[0], transfer.domain_name).catch(e => console.error(e));
                             }
                         } catch (e) {
                             console.error(`[TransferSync] Email error for ${transfer.domain_name}:`, e);
                         }
                    }
                } else {
                    // Update check timestamp even if no change
                    await client.query("UPDATE transfer_requests SET last_check_at = NOW() WHERE id = $1", [transfer.id]);
                }

            } catch (err) {
                console.error(`[TransferSync] Error checking ${transfer.domain_name}:`, err.message);
                // Continue to next domain
            }
        }

    } catch (err) {
        console.error("[TransferSyncWorker] Job Error:", err);
    } finally {
        client.release();
    }
};

// Schedule: Run every 1 hour
// For debugging, we can export the function to run manually
cron.schedule('0 * * * *', () => {
    syncTransfers();
});

module.exports = { syncTransfers };
