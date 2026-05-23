const db = require('../config/db');

class RegistrarBalanceService {
    
    /**
     * Get current balance for a registrar
     * @param {string} registrarName Default: 'daftarnama'
     */
    async getBalance(registrarName = 'daftarnama') {
        try {
            const res = await db.pool.query(
                "SELECT * FROM registrar_balances WHERE registrar_name = $1", 
                [registrarName]
            );
            if (res.rows.length === 0) return null;
            return res.rows[0];
        } catch (error) {
            console.error("[RegistrarBalanceService] Error getting balance:", error);
            throw error;
        }
    }

    /**
     * Add a balance mutation (Credit/Debit)
     * @param {string} registrarName 
     * @param {string} type 'credit' (Topup) or 'debit' (Usage)
     * @param {number} amount Amount in IDR
     * @param {string} description Reason for mutation
     * @param {string} referenceId Optional (Invoice ID or Domain Name)
     */
    /**
     * Add a balance mutation (Credit/Debit)
     * @param {string} registrarName 
     * @param {string} type 'credit' (Topup) or 'debit' (Usage)
     * @param {number} amount Amount in IDR
     * @param {string} description Reason for mutation
     * @param {string} referenceId Optional (Invoice ID or Domain Name)
     * @param {object} externalClient Optional: Existing DB client for transaction safety
     */
    async addMutation(registrarName, type, amount, description, referenceId = null, externalClient = null) {
        const client = externalClient || await db.pool.connect();
        const shouldRelease = !externalClient; // Only release if we created it

        try {
            if (shouldRelease) await client.query('BEGIN');

            // 1. Get Current Balance & Lock Row
            const balanceRes = await client.query(
                "SELECT current_balance FROM registrar_balances WHERE registrar_name = $1 FOR UPDATE",
                [registrarName]
            );

            if (balanceRes.rows.length === 0) {
                // Determine if we should throw or auto-create. For now throw.
                throw new Error(`Registrar ${registrarName} not found in balance table.`);
            }

            const currentBalance = parseFloat(balanceRes.rows[0].current_balance);
            const mutationAmount = parseFloat(amount);
            
            let newBalance = currentBalance;
            if (type === 'credit') {
                newBalance += mutationAmount;
            } else if (type === 'debit') {
                // Allow negative? Warn only.
                if (currentBalance < mutationAmount) {
                     console.warn(`[RegistrarBalanceService] Warning: Balance going negative for ${registrarName}`);
                }
                newBalance -= mutationAmount;
            } else if (type === 'adjustment') {
                 newBalance += mutationAmount;
            }

            // 2. Insert Mutation Record
            await client.query(`
                INSERT INTO registrar_mutations 
                (registrar_name, type, amount, description, reference_id, balance_after)
                VALUES ($1, $2, $3, $4, $5, $6)
            `, [registrarName, type, mutationAmount, description, referenceId, newBalance]);

            // 3. Update Balance
            await client.query(`
                UPDATE registrar_balances 
                SET current_balance = $1, last_sync_at = NOW(), updated_at = NOW()
                WHERE registrar_name = $2
            `, [newBalance, registrarName]);

            if (shouldRelease) await client.query('COMMIT');
            
            return { success: true, newBalance, previousBalance: currentBalance };

        } catch (error) {
            if (shouldRelease) await client.query('ROLLBACK');
            console.error("[RegistrarBalanceService] Mutation Failed:", error);
            throw error;
        } finally {
            if (shouldRelease) client.release();
        }
    }

    /**
     * Sync local balance with remote API
     * @param {string} registrarName 
     */
    async syncBalance(registrarName = 'daftarnama') {
        try {
            console.log(`[RegistrarBalanceService] 🔄 Syncing balance for ${registrarName}...`);
            const DaftarnamaService = require('./DaftarnamaService');
            
            // 1. Fetch remote balance
            const remoteRes = await DaftarnamaService.getMyBalance();
            if (!remoteRes || !remoteRes.data) {
                throw new Error("Invalid response from registrar API");
            }

            const remoteBalance = parseFloat(remoteRes.data.balance);
            
            // 2. Get local balance
            const localBalanceData = await this.getBalance(registrarName);
            const localBalance = localBalanceData ? parseFloat(localBalanceData.current_balance) : 0;

            if (remoteBalance !== localBalance) {
                console.log(`[RegistrarBalanceService] Balance Mismatch: Remote=${remoteBalance}, Local=${localBalance}. Adding adjustment.`);
                const diff = remoteBalance - localBalance;
                await this.addMutation(registrarName, 'adjustment', diff, `Auto-sync with Registrar API (Difference: ${diff})`);
            } else {
                console.log(`[RegistrarBalanceService] Balance is already in sync: ${remoteBalance}`);
            }

            return { success: true, balance: remoteBalance };
        } catch (error) {
            console.error(`[RegistrarBalanceService] Sync Failed for ${registrarName}:`, error.message);
            throw error;
        }
    }
}

module.exports = new RegistrarBalanceService();
