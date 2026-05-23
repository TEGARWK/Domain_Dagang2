const DaftarnamaService = require("../services/DaftarnamaService");
const db = require("../config/db");

// --- GET BALANCE ---
exports.getBalance = async (req, res) => {
    try {
        const balance = await DaftarnamaService.getMyBalance();
        res.json(balance);
    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        
        if (errorMessage.includes("IP address has not been listed")) {
            const publicIp = await DaftarnamaService.getPublicIP();
            return res.status(502).json({
                success: false,
                message: `IP Server (${publicIp}) belum terdaftar di whitelist.`,
                error: "IP_UNAUTHORIZED",
                ip: publicIp
            });
        }

        res.status(500).json({ success: false, message: "Gagal mengambil saldo", error: errorMessage });
    }
};

// --- GET PRICING ---
exports.getPricings = async (req, res) => {
    try {
        const pricings = await DaftarnamaService.getTLDPricings();
        res.json(pricings);
    } catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil data harga", error: error.message });
    }
};

// --- DNS MANAGEMENT ---
exports.getDnsRecords = async (req, res) => {
    try {
        const { domain_name } = req.params;
        const records = await DaftarnamaService.getDNSRecords(domain_name);
        res.json(records);
    } catch (error) {
        res.status(500).json({ success: false, message: "Gagal mengambil DNS records", error: error.message });
    }
};

exports.addDnsRecord = async (req, res) => {
    try {
        const { domain_name } = req.params;
        const result = await DaftarnamaService.addDNSRecord(domain_name, req.body);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Gagal menambah DNS record", error: error.message });
    }
};

exports.deleteDnsRecord = async (req, res) => {
    try {
        const { domain_name, record_id } = req.params;
        const result = await DaftarnamaService.deleteDNSRecord(domain_name, record_id);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, message: "Gagal menghapus DNS record", error: error.message });
    }
};
