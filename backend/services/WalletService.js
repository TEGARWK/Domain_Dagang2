const db = require('../config/db');

class WalletService {
    
    /**
     * Get or Create Wallet for User
     * @param {number} userId 
     * @returns {Promise<object>} Wallet object
     */
    async getWallet(userId) {
        const res = await db.pool.query('SELECT * FROM wallets WHERE user_id = $1', [userId]);
        if (res.rows.length > 0) {
            return res.rows[0];
        } else {
            // Create if not exists (Should be handled by seed/registration, but safe fallback)
            const newWallet = await db.pool.query(
                `INSERT INTO wallets (user_id) VALUES ($1) RETURNING *`, 
                [userId]
            );
            return newWallet.rows[0];
        }
    }

    /**
     * Get Balance
     * @param {number} userId 
     * @returns {Promise<number>} Balance as float
     */
    async getBalance(userId) {
        const wallet = await this.getWallet(userId);
        return parseFloat(wallet.balance);
    }

    /**
     * Credit Wallet (Top Up, Refund)
     * @param {number} userId 
     * @param {number} amount 
     * @param {string} refType 'TOPUP', 'REFUND', 'ADJUSTMENT'
     * @param {string} refId Invoice ID or similar
     * @param {string} description 
     */
    async credit(userId, amount, refType, refId, description) {
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');
            
            // 1. Lock Wallet Row
            const walletRes = await client.query(
                `SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`, 
                [userId]
            );
            
            if (walletRes.rows.length === 0) {
                // Auto-create inside transaction if ensuring consistency
                await client.query(`INSERT INTO wallets (user_id) VALUES ($1)`, [userId]);
            }

            // 2. Update Balance
            const updateRes = await client.query(
                `UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE user_id = $2 RETURNING id, balance`,
                [amount, userId]
            );
            const walletId = updateRes.rows[0].id;
            const newBalance = updateRes.rows[0].balance;

            // 3. Log Transaction
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after)
                 VALUES ($1, 'CREDIT', $2, $3, $4, $5, $6)`,
                [walletId, amount, refType, refId, description, newBalance]
            );

            await client.query('COMMIT');
            // Updated balance log removed
            return { success: true, newBalance };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[Wallet] Credit Failed:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Debit Wallet (Payment, Renewal)
     * Uses Row Locking to prevent race conditions
     * @param {number} userId 
     * @param {number} amount 
     * @param {string} refType 'PAYMENT', 'RENEWAL'
     * @param {string} refId Invoice ID
     * @param {string} description 
     */
    async debit(userId, amount, refType, refId, description, dbClient = null) {
        const client = dbClient || await db.pool.connect();
        const shouldRelease = !dbClient; // Only release if we created it

        try {
            if (shouldRelease) await client.query('BEGIN');

            // 1. Lock Wallet Row
            const walletRes = await client.query(
                `SELECT * FROM wallets WHERE user_id = $1 FOR UPDATE`, 
                [userId]
            );
            
            if (walletRes.rows.length === 0) throw new Error("Wallet not found");
            
            const currentBalance = parseFloat(walletRes.rows[0].balance);

            // 2. Check Sufficient Balance
            if (currentBalance < amount) {
                throw new Error("Insufficient Balance");
            }

            // 3. Deduct Balance
            const updateRes = await client.query(
                `UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE user_id = $2 RETURNING id, balance`,
                [amount, userId]
            );
            const walletId = updateRes.rows[0].id;
            const newBalance = updateRes.rows[0].balance;

            // 4. Log Transaction
            await client.query(
                `INSERT INTO wallet_transactions (wallet_id, type, amount, reference_type, reference_id, description, balance_after)
                 VALUES ($1, 'DEBIT', $2, $3, $4, $5, $6)`,
                [walletId, amount, refType, refId, description, newBalance]
            );

            if (shouldRelease) await client.query('COMMIT');
            // Updated balance log removed
            return { success: true, newBalance };

        } catch (error) {
            if (shouldRelease) await client.query('ROLLBACK');
            console.error(`[Wallet] Debit Failed:`, error.message);
            // Return clean error object instead of throwing if prefer
            throw error; 
            if (shouldRelease) client.release();
        }
    }

    /**
     * Hold Balance for Withdrawal Request
     * Effectively a debit, but with specific type 'WITHDRAW_HOLD'
     * @param {number} userId 
     * @param {number} amount 
     * @param {number} withdrawalId 
     */
    /**
     * Lock Balance for Withdrawal
     * - Decrement balance (available)
     * - Increment balance_locked
     * @param {number} userId
     * @param {number} amount
     * @param {object} dbClient - Mandatory Transaction Client
     */
    async lockBalance(userId, amount, dbClient) {
        if (!dbClient) throw new Error("Transaction Client required for lockBalance");

        // 1. Lock Wallet Row
        const walletRes = await dbClient.query(
            `SELECT balance FROM wallets WHERE user_id = $1 FOR UPDATE`, 
            [userId]
        );
        
        if (walletRes.rows.length === 0) throw new Error("Wallet not found");
        
        const currentBalance = parseFloat(walletRes.rows[0].balance);
        if (currentBalance < amount) throw new Error("Insufficient Available Balance");

        // 2. Move Funds: Available -> Locked
        await dbClient.query(
            `UPDATE wallets 
             SET balance = balance - $1, 
                 balance_locked = balance_locked + $1,
                 updated_at = NOW() 
             WHERE user_id = $2`,
            [amount, userId]
        );
                 
        // Lock log removed
    }

    /**
     * Unlock Balance (Rollback/Failed Withdrawal)
     * - Decrement balance_locked
     * - Increment balance (return to available)
     * @param {number} userId
     * @param {number} amount
     * @param {object} dbClient - Mandatory Transaction Client
     */
    async unlockBalance(userId, amount, dbClient) {
        if (!dbClient) throw new Error("Transaction Client required for unlockBalance");

        await dbClient.query(
            `UPDATE wallets 
             SET balance = balance + $1, 
                 balance_locked = balance_locked - $1,
                 updated_at = NOW() 
             WHERE user_id = $2`,
            [amount, userId]
        );
        // Unlock log removed
    }

    /**
     * Finalize Withdrawal (Success)
     * - Decrement balance_locked (Burn funds)
     * @param {number} userId
     * @param {number} amount
     * @param {object} dbClient - Mandatory Transaction Client
     */
    async finalizeWithdrawal(userId, amount, dbClient) {
        if (!dbClient) throw new Error("Transaction Client required for finalizeWithdrawal");

        await dbClient.query(
            `UPDATE wallets 
             SET balance_locked = balance_locked - $1,
                 updated_at = NOW() 
             WHERE user_id = $2`,
            [amount, userId]
        );
        // Finalize log removed
    }
}

module.exports = new WalletService();
