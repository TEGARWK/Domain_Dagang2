const db = require('../config/db');
const WalletService = require('./WalletService');
const NotificationService = require('./NotificationService');
const EmailService = require('./EmailService');

class WalletWithdrawalService {
    
    /**
     * Create a new withdrawal request
     * - Checks balance
     * - Holds funds
     * - Creates request record
     */

    /**
     * Create Withdrawal Request (Manual Flow)
     * 1. Check Idempotency
     * 2. Check Rate Limit
     * 3. DB Transaction: Lock Balance & Create Record
     */
    async createRequest(userId, amount, method, account, idempotencyKey) {
        // 1 Validation
        const minAmount = 10000;
        const maxAmount = 5000000;
        if (amount < minAmount) throw new Error(`Minimum withdrawal is Rp ${minAmount.toLocaleString('id-ID')}`);
        if (amount > maxAmount) throw new Error(`Maximum withdrawal is Rp ${maxAmount.toLocaleString('id-ID')}`);

        const client = await db.pool.connect();
        try {
            // 2. Idempotency Check (Pre-Transaction Read)
            if (idempotencyKey) {
                const existing = await db.pool.query(
                    'SELECT * FROM withdraw_transactions WHERE idempotency_key = $1',
                    [idempotencyKey]
                );
                if (existing.rows.length > 0) {
                    return { success: true, message: "Request already processed", data: existing.rows[0] };
                }
            }

            // 3. Rate Limit Check (3x per day)
            const todayStats = await db.pool.query(
                `SELECT COUNT(*) as count FROM withdraw_transactions 
                 WHERE user_id = $1 AND created_at > CURRENT_DATE`,
                [userId]
            );
            if (parseInt(todayStats.rows[0].count) >= 3) {
                throw new Error("Daily withdrawal limit reached (Max 3/day)");
            }

            // --- START TRANSACTION ---
            await client.query('BEGIN');

            // 4. Lock Balance
            await WalletService.lockBalance(userId, amount, client);

            // 5. Create Transaction Record (Pending)
            const insertRes = await client.query(
                `INSERT INTO withdraw_transactions 
                (user_id, idempotency_key, amount, bank_code, account_number, account_name, status, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW())
                RETURNING *`,
                [userId, idempotencyKey, amount, method, account.number, account.name]
            );
            const transaction = insertRes.rows[0];

            await client.query('COMMIT');
            // --- END TRANSACTION ---

            // Notifications
            NotificationService.createNotification(
                userId,
                "Penarikan Diajukan",
                `Permintaan penarikan Rp ${amount.toLocaleString('id-ID')} sedang menunggu persetujuan admin.`,
                "info",
                transaction.id.toString(),
                "withdrawal"
            ).catch(console.error);

            return { 
                success: true, 
                message: "Permintaan penarikan berhasil diajukan dan sedang menunggu persetujuan.", 
                data: transaction 
            };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Get Withdrawal History for User
     */
    async getUserHistory(userId) {
        const res = await db.pool.query(
            `SELECT 
                id, 
                created_at, 
                amount, 
                status, 
                bank_code as method, 
                account_number, 
                account_name, 
                failure_reason as admin_notes,
                gateway_response 
            FROM withdraw_transactions 
            WHERE user_id = $1 
            ORDER BY created_at DESC`,
            [userId]
        );
        return res.rows;
    }

    /**
     * Get All Withdrawals (Admin)
     */
    async getAllRequests(status = null) {
        let query = `
            SELECT w.*, u.name as user_name, u.email as user_email 
            FROM withdraw_transactions w
            JOIN users u ON w.user_id = u.id
        `;
        const params = [];

        if (status) {
            query += ` WHERE w.status = $1`;
            params.push(status);
        }

        query += ` ORDER BY w.created_at DESC`;
        
        const res = await db.pool.query(query, params);
        return res.rows;
    }

    /**
     * Approve Request (Mark as Approved)
     * Funds are already held, so just update status.
     * Admin should then transfer money manually.
     */
    async approveRequest(requestId, adminId) {
        // Only update if pending
        const res = await db.pool.query(
            `UPDATE withdraw_transactions 
             SET status = 'approved', updated_at = NOW() 
             WHERE id = $1 AND status = 'pending'
             RETURNING *`,
            [requestId]
        );

        if (res.rowCount === 0) throw new Error("Request not found or not pending");
        
        const request = res.rows[0];
        
        // Fetch User
        const userRes = await db.pool.query('SELECT id, name, email FROM users WHERE id = $1', [request.user_id]);
        const user = userRes.rows[0];

        // Notifications
        await NotificationService.createNotification(
            request.user_id,
            "Penarikan Disetujui",
            `Permintaan penarikan Rp ${parseFloat(request.amount).toLocaleString('id-ID')} disetujui. Dana akan segera dikirim oleh admin.`,
            "success",
            requestId.toString(),
            "withdrawal"
        );

        if (user && user.email) {
            EmailService.send('WITHDRAWAL_APPROVED', {
                user: user,
                amount: parseFloat(request.amount).toLocaleString('id-ID')
            }).catch(e => console.error("Email Error:", e));
        }

        return request;
    }

    /**
     * Reject Request
     * - Refund held funds
     * - Update status to rejected
     */
    async rejectRequest(requestId, adminId, reason) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get Request
            const reqRes = await client.query(
                `SELECT * FROM withdraw_transactions WHERE id = $1 FOR UPDATE`,
                [requestId]
            );
            if (reqRes.rows.length === 0) throw new Error("Request not found");
            
            const request = reqRes.rows[0];
            if (request.status !== 'pending' && request.status !== 'approved') {
                throw new Error("Request cannot be rejected in its current status");
            }

            // 2. Update Status
            await client.query(
                `UPDATE withdraw_transactions 
                 SET status = 'rejected', failure_reason = $1, updated_at = NOW()
                 WHERE id = $2`,
                [reason, requestId]
            );

            // 3. Refund Funds
            await client.query(
                `UPDATE wallets SET balance_locked = balance_locked - $1, updated_at = NOW() WHERE user_id = $2`,
                [request.amount, request.user_id]
            );
            
            // Get Wallet ID for logging
            const walletRes = await client.query(`SELECT id, balance FROM wallets WHERE user_id = $1`, [request.user_id]);
            const wallet = walletRes.rows[0];

            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after)
                 VALUES ($1, 'CREDIT', $2, 'WITHDRAW_REFUND', $3, $4, $5)`,
                [wallet.id, request.amount, requestId, `Penarikan Ditolak: ${reason}`, wallet.balance]
            );

            // Fetch User
            const userRes = await client.query('SELECT id, name, email FROM users WHERE id = $1', [request.user_id]);
            const user = userRes.rows[0];

            // Notifications
            await NotificationService.createNotification(
                request.user_id,
                "Penarikan Ditolak",
                `Permintaan penarikan Rp ${parseFloat(request.amount).toLocaleString('id-ID')} ditolak. Alasan: ${reason}. Saldo telah dikembalikan.`,
                "error",
                requestId.toString(),
                "withdrawal"
            );

            if (user && user.email) {
                EmailService.send('WITHDRAWAL_REJECTED', {
                    user: user,
                    amount: parseFloat(request.amount).toLocaleString('id-ID'),
                    reason: reason
                }).catch(e => console.error("Email Error:", e));
            }

            await client.query('COMMIT');
            return { success: true, message: "Permintaan ditolak dan saldo dikembalikan." };

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Complete Request (Mark as Transfer Completed)
     */
    async completeRequest(requestId, adminId, proof = '') {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get Transaction
            const trxRes = await client.query(`SELECT * FROM withdraw_transactions WHERE id = $1 FOR UPDATE`, [requestId]);
            if (trxRes.rowCount === 0) throw new Error("Request not found");
            const transaction = trxRes.rows[0];

            if (transaction.status !== 'approved' && transaction.status !== 'pending') {
                throw new Error("Only approved or pending requests can be completed");
            }

            // 2. Finalize Wallet (Deduct Balance & Unlock)
            await WalletService.finalizeWithdrawal(transaction.user_id, transaction.amount, client);

            // 3. Update Transaction Record
            const res = await client.query(
                `UPDATE withdraw_transactions 
                 SET status = 'completed', failure_reason = $1, updated_at = NOW() 
                 WHERE id = $2
                 RETURNING *`,
                [proof, requestId]
            );
            
            const request = res.rows[0];

            // Fetch User
            const userRes = await client.query('SELECT id, name, email FROM users WHERE id = $1', [request.user_id]);
            const user = userRes.rows[0];

            // Notifications
            await NotificationService.createNotification(
                request.user_id,
                "Penarikan Berhasil",
                `Dana penarikan Rp ${parseFloat(request.amount).toLocaleString('id-ID')} telah berhasil dikirim ke rekening Anda.`,
                "success",
                requestId.toString(),
                "withdrawal"
            );

            if (user && user.email) {
                EmailService.send('WITHDRAWAL_COMPLETED', {
                    user: user,
                    amount: parseFloat(request.amount).toLocaleString('id-ID'),
                    proof: proof
                }).catch(e => console.error("Email Error:", e));
            }

            await client.query('COMMIT');
            return request;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new WalletWithdrawalService();
