const db = require('../config/db');
const WalletService = require('../services/WalletService');

exports.getMyWallet = async (req, res) => {
    const userId = req.user.id;
    try {
        // 1. Get Wallet
        const wallet = await WalletService.getWallet(userId);
        
        // 2. Get Recent Transactions
        const historyRes = await db.pool.query(`
            SELECT * FROM wallet_transactions 
            WHERE wallet_id = $1 
            ORDER BY created_at DESC 
            LIMIT 50
        `, [wallet.id]);

        res.json({
            balance: parseFloat(wallet.balance),
            currency: wallet.currency,
            transactions: historyRes.rows.map(tx => ({
                id: tx.id,
                type: tx.type, // CREDIT / DEBIT
                amount: parseFloat(tx.amount),
                reference_type: tx.reference_type,
                reference_id: tx.reference_id,
                description: tx.description,
                balance_after: parseFloat(tx.balance_after),
                date: tx.created_at
            }))
        });

    } catch (err) {
        console.error("[WalletController] Error:", err);
        res.status(500).json({ error: "Failed to fetch wallet data" });
    }
};
