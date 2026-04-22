const db = require("../config/db");

// Helper to slugify Tripay groups (Match Admin UI logic)
const slugifyGroup = (name) => (name || '').toUpperCase().replace(/\s+/g, '');

// 1. Get All Gateways (Public - for Checkout)
// For Tripay: fetch live from Tripay API /merchant/payment-channel
// This ensures only actually-active channels are shown.
exports.getAll = async (req, res) => {
  const TripayService = require('../services/TripayService');

  try {
    const gatewayRes = await db.pool.query("SELECT * FROM payment_gateways WHERE provider = 'tripay' LIMIT 1");
    const adminConfig = gatewayRes.rows[0];

    if (!adminConfig || adminConfig.is_active === false) {
      return res.status(200).json([]);
    }

    // Helper to safely parse JSON or return default
    const safeParse = (data, fallback) => {
      if (!data) return fallback;
      if (typeof data === 'object') return data;
      try { return JSON.parse(data); } catch (e) { return fallback; }
    };

    const enabledMethods = safeParse(adminConfig.enabled_methods, []);
    const enabledBanks = safeParse(adminConfig.enabled_banks, {});

    // 2. Ambil Channel dari Tripay API
    const result = await TripayService.getPaymentChannels();

    if (!result.success || !Array.isArray(result.data)) {
      console.error('[PaymentGateway] Tripay API failed');
      return res.status(200).json([]);
    }

    const channels = result.data
      .filter(ch => ch.active)
      .reduce((acc, ch) => {
        const rawGroup = ch.group || '';
        const originalGroup = slugifyGroup(rawGroup);
        const chCode = (ch.code || '').toUpperCase();
        const isQris = chCode.startsWith('QRIS');
        
        // --- FILTER BERDASARKAN ADMIN CONFIG ---
        // A. Cek apakah kategori (Group) ini diaktifkan di admin
        // Kita cek originalGroup karena Admin UI mengelompokkan berdasarkan data asli Tripay
        if (!enabledMethods.includes(originalGroup)) return acc;

        // B. Cek apakah bank/channel spesifik ini diaktifkan di admin
        const banksInGroup = (enabledBanks[originalGroup] || []).map(b => b.toUpperCase());
        const cleanChCode = chCode.replace('VA', '');

        // Lakukan pengecekan fleksibel (Match standar ATAU match tanpa akhiran VA)
        const isAllowed = banksInGroup.some(dbBank => 
          dbBank === chCode || 
          dbBank === cleanChCode ||
          (dbBank + 'VA') === chCode
        );

        if (!isAllowed) return acc;

        acc.push({
          id:          `${ch.code.toLowerCase()}_tripay`,
          type:        isQris ? 'SCANNERQRIS' : originalGroup,
          code:        ch.code, 
          name:        ch.name,
          logo:        ch.code,
          provider:    'tripay',
          icon_url:    ch.icon_url || null,
          fee_flat:    ch.total_fee?.flat || ch.fee_customer?.flat || ch.fee_merchant?.flat || 0,
          fee_percent: parseFloat(ch.total_fee?.percent || ch.fee_customer?.percent || ch.fee_merchant?.percent || 0),
          minimum_fee: parseFloat(ch.minimum_fee || 0),
        });
        return acc;
      }, []);

    return res.status(200).json(channels);

  } catch (err) {
    console.error('[PaymentGateway] getAll error:', err.message);
    return res.status(500).json({ error: 'Failed to load payment channels' });
  }
};


/**
 * Calculate Fee for a specific channel and amount
 */
exports.calculateFee = async (req, res) => {
    const { channel, amount } = req.query;
    const TripayService = require('../services/TripayService');

    if (!channel || !amount) {
        return res.status(400).json({ success: false, message: "Channel and amount are required." });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ success: false, message: "Amount must be a positive number." });
    }

    try {
        const result = await TripayService.getFeeCalculation(channel, Math.floor(parsedAmount));
        
        if (!result.success) {
            console.error(`[PaymentGateway] ❌ Tripay Fee Calc failed:`, result.error);
            return res.status(400).json({ success: false, message: result.error || "Failed to calculate fee." });
        }

        const feeData = result.data;
        if (!feeData) {
            return res.status(400).json({ success: false, message: "No fee data returned for this method." });
        }

        const feeMerchant = parseFloat(feeData.total_fee?.merchant || feeData.fee_merchant || 0);
        const feeCustomer = parseFloat(feeData.total_fee?.customer || feeData.fee_customer || 0);
        
        // --- FIX: Only feeCustomer should be added to the customer's bill ---
        const totalFee = feeCustomer; 

        return res.status(200).json({
            success: true,
            data: {
                channel: channel,
                amount: parsedAmount,
                fee_merchant: feeMerchant, // FYI for potential logic later
                fee_customer: feeCustomer,
                total_fee: totalFee,
                total_bayar: parsedAmount + totalFee,
                minimum_fee: parseFloat(feeData.fee?.min || 0)
            }
        });
    } catch (err) {
        console.error("Calculate Fee Controller Error:", err);
        return res.status(500).json({ success: false, message: "Internal server error." });
    }
};

// 2. Get All Gateways (Admin - for Management)
// Returns ONLY 'tripay' row for the admin panel
exports.getAllAdmin = (req, res) => {
  const sql = "SELECT * FROM payment_gateways WHERE provider = 'tripay' LIMIT 1";

  db.query(sql, (err, data) => {
    if (err) return res.status(500).json({ error: err.message });
    const rows = (data.rows || data).map(row => ({
      ...row,
      suggested_webhook_url: `${process.env.BACKEND_URL || 'http://localhost:3009'}/api/tripay/webhook`
    }));
    return res.status(200).json(rows);
  });
};

// 3. Update Gateway Config (Admin)
exports.update = (req, res) => {
  const { provider } = req.params; 
  const { 
    is_active, 
    mode, 
    enabled_methods, 
    enabled_banks, 
    instructions, 
    api_key, 
    private_key, 
    merchant_code,
    webhook_url 
  } = req.body;

  const sql = `
    UPDATE payment_gateways 
    SET is_active = $1, mode = $2, enabled_methods = $3, enabled_banks = $4, instructions = $5,
        api_key = $6, private_key = $7, merchant_code = $8, webhook_url = $9
    WHERE provider = $10
  `;
  
  const methodsStr = JSON.stringify(enabled_methods || []);
  const banksStr = JSON.stringify(enabled_banks || {});

  const values = [
    is_active, 
    mode, 
    methodsStr, 
    banksStr, 
    instructions || "", 
    api_key || null, 
    private_key || null, 
    merchant_code || null,
    webhook_url || null,
    provider
  ];

  db.query(sql, values, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json({ success: true, message: "Payment Gateway configuration updated." });
  });
};

/**
 * Get Tripay Balance (Admin Only)
 */
exports.getTripayBalance = async (req, res) => {
    const TripayService = require('../services/TripayService');
    try {
        const balance = await TripayService.getMerchantBalance();
        return res.status(200).json(balance);
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Get ALL available Tripay Channels from API (Admin Only)
 */
exports.getTripayChannels = async (req, res) => {
    const TripayService = require('../services/TripayService');
    try {
        const result = await TripayService.getPaymentChannels();
        if (!result.success) {
            return res.status(400).json({ success: false, message: result.error });
        }
        return res.status(200).json({ success: true, data: result.data });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
};

// Legacy stubs to prevent crashing if old routes hit them
exports.create = (req, res) => res.status(405).json("Method Not Allowed");
exports.delete = (req, res) => res.status(405).json("Method Not Allowed");
