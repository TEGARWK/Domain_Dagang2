const WalletWithdrawalService = require('../services/WalletWithdrawalService');

exports.createRequest = async (req, res) => {
    try {
        const { amount, method, account_number, account_name } = req.body;
        const userId = req.user.id;
        // Get Idempotency Key from Header (Standard) or Body (Fallback)
        const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotency_key;

        const result = await WalletWithdrawalService.createRequest(
            userId, 
            parseFloat(amount), 
            method, 
            { number: account_number, name: account_name },
            idempotencyKey
        );

        res.json(result);
    } catch (error) {
        console.error("Create Withdrawal Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getMyHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const history = await WalletWithdrawalService.getUserHistory(userId);
        res.json({ success: true, data: history });
    } catch (error) {
        console.error("Get History Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Admin Endpoints
exports.getAllRequests = async (req, res) => {
    try {
        const { status } = req.query;
        // status is optional filter
        const requests = await WalletWithdrawalService.getAllRequests(status === 'all' ? null : status);
        res.json({ success: true, data: requests });
    } catch (error) {
        console.error("Get All Requests Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.user.id;
        
        const result = await WalletWithdrawalService.approveRequest(id, adminId);
        res.json({ success: true, message: "Request approved", data: result });
    } catch (error) {
        console.error("Approve Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const adminId = req.user.id;
        
        const result = await WalletWithdrawalService.rejectRequest(id, adminId, reason);
        res.json({ success: true, message: "Request rejected", data: result });
    } catch (error) {
        console.error("Reject Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.completeRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { proof } = req.body;
        const adminId = req.user.id;
        
        const result = await WalletWithdrawalService.completeRequest(id, adminId, proof);
        res.json({ success: true, message: "Request completed", data: result });
    } catch (error) {
        console.error("Complete Error:", error);
        res.status(400).json({ success: false, message: error.message });
    }
};
