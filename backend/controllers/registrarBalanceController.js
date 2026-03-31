const RegistrarBalanceService = require('../services/RegistrarBalanceService');
const db = require('../config/db');

// Get Balance & Recent Mutations
exports.getDetails = async (req, res) => {
    try {
        const registrarName = req.query.registrar || 'daftarnama';
        
        let balanceData = await RegistrarBalanceService.getBalance(registrarName);
        if (!balanceData) {
            // Create default if not exists
            await db.pool.query("INSERT INTO registrar_balances (registrar_name) VALUES ($1) ON CONFLICT DO NOTHING", [registrarName]);
            balanceData = { current_balance: 0, currency: 'IDR' };
        }
        
        // 2. Get Last 50 Mutations
        const historyRes = await db.pool.query(
            "SELECT * FROM registrar_mutations WHERE registrar_name = $1 ORDER BY created_at DESC LIMIT 50",
            [registrarName]
        );

        res.json({
            success: true,
            balance: balanceData,
            history: historyRes.rows
        });

    } catch (error) {
        console.error("Error fetching registrar balance details:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Manual Top Up (Credit)
exports.manualTopup = async (req, res) => {
    try {
        const { amount, description, registrar } = req.body;
        const adminId = req.user?.id || 0; 

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Amount must be greater than 0" });
        }

        const registrarName = registrar || 'daftarnama';
        const notes = description || `Manual Topup by Admin #${adminId}`;

        const result = await RegistrarBalanceService.addMutation(
            registrarName, 
            'credit', 
            amount, 
            notes, 
            `MANUAL-${Date.now()}`
        );

        res.json({
            success: true,
            message: "Top up successful",
            data: result
        });

    } catch (error) {
        console.error("Error manual topup:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sync with Registrar API
exports.sync = async (req, res) => {
    try {
        const registrarName = req.query.registrar || 'daftarnama';
        const result = await RegistrarBalanceService.syncBalance(registrarName);
        
        res.json({
            success: true,
            message: "Sinkronisasi berhasil",
            balance: result.balance
        });
    } catch (error) {
        console.error("Error syncing registrar balance:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
