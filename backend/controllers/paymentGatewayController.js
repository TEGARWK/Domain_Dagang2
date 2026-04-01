const db = require("../config/db");

// 1. Get All Gateways (Public - for Checkout)
// Transforms the single 'prismalink' config into a list of available channels
exports.getAll = (req, res) => {
  // Ambil config 'prismalink' dari database
  const sql = "SELECT * FROM payment_gateways WHERE provider = 'prismalink' AND is_active = true";
  
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json(err);
    if (data.length === 0) return res.json([]);

    const config = data[0];
    let enabledBanks = {};
    try {
        if (typeof config.enabled_banks === 'string') {
            enabledBanks = JSON.parse(config.enabled_banks);
        } else {
            enabledBanks = config.enabled_banks || {};
        }
    } catch (e) {
        console.error("[PaymentGateway] Failed to parse enabled_banks:", e);
        enabledBanks = {};
    }
    
    const channels = [];

    // 1. Virtual Account (VA) Channels
    // Mapping kode bank yang didukung PrismaLink -> Nama Display
    const vaMap = {
        'BCA': 'BCA Virtual Account',
        'BNI': 'BNI Virtual Account',
        'BRI': 'BRI Virtual Account',
        'MANDIRI': 'Mandiri Virtual Account',
        'PERMATA': 'Permata Virtual Account',
        'CIMB': 'CIMB Niaga Virtual Account',
        'DANAMON': 'Danamon Virtual Account',
        'BSI': 'BSI Virtual Account'
    };

    // Jika di config DB ada key "VA" (array of strings), kita loop
    if (enabledBanks.VA && Array.isArray(enabledBanks.VA)) {
        enabledBanks.VA.forEach(bankCode => {
            if (vaMap[bankCode]) {
                channels.push({
                    id: `va_${bankCode.toLowerCase()}`, // Unique ID untuk frontend selection
                    type: 'VA',
                    code: bankCode,       // Dikirim ke backend sebagai bank_code
                    name: vaMap[bankCode],
                    logo: bankCode,       // Frontend bisa ganti jadi icon bank
                    provider: 'prismalink',
                    admin_fee: 0          // Bisa disesuaikan
                });
            }
        });
    }

    // 2. QRIS Channel
    if (enabledBanks.QRIS && Array.isArray(enabledBanks.QRIS) && enabledBanks.QRIS.includes('QRIS')) {
        channels.push({
            id: 'qris_prismalink',
            type: 'QRIS',
            code: 'QRIS',
            name: 'QRIS (Scan QR)',
            logo: 'QRIS',
            provider: 'prismalink',
            admin_fee: 0
        });
    }

    return res.status(200).json(channels);
  });
};

// 2. Get All Gateways (Admin - for Management)
// Returns the raw config row for 'prismalink'
exports.getAllAdmin = (req, res) => {
  const sql = "SELECT * FROM payment_gateways WHERE provider = 'prismalink'";

  db.query(sql, (err, data) => {
    if (err) return res.status(500).json(err);
    // If not exists, insert default (safety net)
    if (data.length === 0) {
        const defaultInsert = `
            INSERT INTO payment_gateways (name, bank_name, account_number, account_holder, provider, is_active, mode, enabled_methods, enabled_banks, instructions)
            VALUES ($1, $1, '0', 'SYSTEM', 'prismalink', true, 'sandbox', $2, $3, 'Pembayaran Otomatis')
        `;
        const methodsDefault = JSON.stringify(["VA", "QRIS"]);
        const banksDefault = JSON.stringify({"VA": ["BCA", "BNI", "MANDIRI", "BRI"], "QRIS": ["QRIS"]});
        
        db.query(defaultInsert, ['PrismaLink', methodsDefault, banksDefault], (err2) => {
            if (err2) return res.status(500).json(err2);
            return exports.getAllAdmin(req, res); // Recurse once
        });
        return;
    }
    return res.status(200).json(data);
  });
};

// 3. Update Gateway Config (Admin)
exports.update = (req, res) => {
  const { provider } = req.params; // Should be 'prismalink'
  const { is_active, mode, enabled_methods, enabled_banks, instructions } = req.body;

  const sql = `
    UPDATE payment_gateways 
    SET is_active = $1, mode = $2, enabled_methods = $3, enabled_banks = $4, instructions = $5
    WHERE provider = $6
  `;
  
  // Ensure JSON is stringified if DB requires it, but PG driver often handles objects if column is JSONB.
  // Based on migration, it's JSONB/JSON.
  const methodsStr = JSON.stringify(enabled_methods);
  const banksStr = JSON.stringify(enabled_banks);

  const values = [is_active, mode, methodsStr, banksStr, instructions || "", provider];

  db.query(sql, values, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json("Payment Gateway configuration updated.");
  });
};

// Legacy stubs to prevent crashing if old routes hit them
exports.create = (req, res) => res.status(405).json("Method Not Allowed");
exports.delete = (req, res) => res.status(405).json("Method Not Allowed");
