const FinanceService = require('../services/FinanceService');

exports.getPeriodData = async (req, res) => {
    try {
        const { month, year } = req.query;
        if (!month || !year) {
            return res.status(400).json({ success: false, message: "Bulan dan tahun diperlukan." });
        }
        
        const data = await FinanceService.getPeriodData(parseInt(month), parseInt(year));
        res.json({ success: true, data });
    } catch (error) {
        console.error("financeController.getPeriodData Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.saveConfigs = async (req, res) => {
    try {
        const { period_id } = req.body;
        if (!period_id) {
            return res.status(400).json({ success: false, message: "Period ID diperlukan." });
        }

        // Teruskan seluruh body (configs, locations, holders) ke service
        await FinanceService.saveConfigs(period_id, req.body);
        res.json({ success: true, message: "Konfigurasi berhasil disimpan dan seluruh data diperbarui." });
    } catch (error) {
        console.error("financeController.saveConfigs Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addMutation = async (req, res) => {
    try {
        const { period_id, type, category, nominal } = req.body;
        if (!period_id || !type || !category || !nominal) {
            return res.status(400).json({ success: false, message: "Data mutasi tidak lengkap." });
        }

        await FinanceService.addMutation(req.body);
        res.json({ success: true, message: "Mutasi berhasil dicatat." });
    } catch (error) {
        console.error("financeController.addMutation Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
