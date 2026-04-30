const db = require('../config/db');
const TripayService = require('../services/TripayService');

// --- PUBLIC FUNCTIONS ---

exports.getAll = async (req, res) => {
  console.log(`[GATEWAY DEBUG] Request received from: ${req.ip}`);
  try {
    const allChannels = [];

    // 1. Ambil & Bongkar Tripay Channels
    const tripayRes = await db.pool.query("SELECT * FROM payment_gateways WHERE provider = 'tripay' AND is_active = true LIMIT 1");
        if (tripayRes.rows.length > 0) {
            const config = tripayRes.rows[0];
            const rawBanks = typeof config.enabled_banks === 'string' ? JSON.parse(config.enabled_banks) : (config.enabled_banks || {});
            
            const activeCodesSet = new Set();

            if (Array.isArray(rawBanks)) {
                // FORMAT BARU: Flat Array ["BCAVA", "BNIVA"]
                rawBanks.forEach(code => {
                    if (code) activeCodesSet.add(String(code).toUpperCase());
                });
            } else {
                // FORMAT LAMA: Objek { VA: [...], QRIS: [...] }
                Object.values(rawBanks).forEach(codes => {
                    if (Array.isArray(codes)) {
                        codes.forEach(code => {
                            if (code) activeCodesSet.add(String(code).toUpperCase());
                        });
                    }
                });
            }

            const activeCodes = Array.from(activeCodesSet);
            
            // Ambil data detail channel dari API Tripay (via Service) untuk mendapatkan logo & fee terbaru
            const tripayData = await TripayService.getPaymentChannels();
            if (tripayData && tripayData.success) {

            tripayData.data.forEach(ch => {
                const channelCode = String(ch.code).toUpperCase();
                if (activeCodes.includes(channelCode)) {
                    // Mapping tipe agar sesuai dengan filter di Checkout.jsx
                    let mappedType = 'VA';
                    const group = (ch.group || '').toLowerCase();
                    if (group.includes('qris') || ch.name.toLowerCase().includes('qris')) {
                        mappedType = 'QRIS';
                    } else if (group.includes('e-wallet')) {
                        mappedType = 'EWALLET';
                    } else {
                        mappedType = 'VA';
                    }

                    allChannels.push({
                        id: `${ch.code.toLowerCase()}_tripay`,
                        code: ch.code,
                        name: ch.name,
                        provider: 'tripay',
                        type: mappedType,
                        fee_flat: ch.fee_merchant.flat || 0,
                        fee_percent: ch.fee_merchant.percent || 0,
                        icon_url: ch.icon_url
                    });
                }
            });
        }
    }

    // 2. Ambil & Bongkar Manual Channels
    const manualRes = await db.pool.query("SELECT * FROM payment_gateways WHERE provider = 'manual' AND is_active = true");
    console.log(`[DEBUG] Found ${manualRes.rows.length} active manual channels`);
    manualRes.rows.forEach(m => {
        // Mapping tipe agar muncul di kategori yang benar di Checkout.jsx
        let mappedType = 'VA';
        if (m.gateway_type === 'qris') {
            mappedType = 'QRIS';
        } else if (m.gateway_type === 'bank') {
            mappedType = 'VA';
        } else {
            mappedType = m.gateway_type || 'VA';
        }

        allChannels.push({
            id: m.id,
            name: m.bank_name || m.name,
            provider: 'manual',
            type: mappedType,
            bank_name: m.bank_name,
            account_number: m.account_number,
            account_holder: m.account_holder,
            instructions: m.instructions,
            qris_url: m.qris_url,
            logo_url: m.logo_url,
            icon_url: m.logo_url || (mappedType === 'QRIS' ? '/image/banks/qris.png' : '/image/banks/manual.png')
        });
    });

    // 3. Ambil & Bongkar Prismalink Channels
    const prismalinkRes = await db.pool.query("SELECT * FROM payment_gateways WHERE provider = 'prismalink' AND is_active = true LIMIT 1");
    if (prismalinkRes.rows.length > 0) {
        const plConfig = prismalinkRes.rows[0];
        const safeParse = (data, fallback) => {
            if (!data) return fallback;
            if (typeof data === 'object') return data;
            try { return JSON.parse(data); } catch (e) { return fallback; }
        };
        const plEnabledMethods = safeParse(plConfig.enabled_methods, []);
        const PL_MAP = {
            '014': { name: 'BCA Virtual Account', type: 'VA' },
            '008': { name: 'Mandiri Virtual Account', type: 'VA' },
            '009': { name: 'BNI Virtual Account', type: 'VA' },
            '002': { name: 'BRI Virtual Account', type: 'VA' },
            '013': { name: 'Permata Virtual Account', type: 'VA' },
            '011': { name: 'Danamon Virtual Account', type: 'VA' },
            '451': { name: 'BSI Virtual Account', type: 'VA' },
            'QR':  { name: 'QRIS (GPN)', type: 'QRIS' },
            'CC':  { name: 'Credit Card', type: 'CC' }
        };
        const PL_LOGOS = {
            '002': '/image/banks/bri.png',
            '008': '/image/banks/mandiri.png',
            '009': '/image/banks/bni.png',
            '014': '/image/banks/bca.png',
            '011': '/image/banks/danamon.png',
            '013': '/image/banks/permata.png',
            '451': '/image/banks/bsi.png',
            'QR': '/image/banks/qris.png'
        };
        plEnabledMethods.forEach(methodId => {
            const meta = PL_MAP[methodId];
            if (meta) {
                allChannels.push({
                    id: `${methodId.toLowerCase()}_prismalink`,
                    type: meta.type,
                    code: methodId,
                    name: meta.name,
                    provider: 'prismalink',
                    icon_url: PL_LOGOS[methodId] || null
                });
            }
        });
    }

    console.log(`[GATEWAY DEBUG] Sending ${allChannels.length} channels to frontend:`, 
        allChannels.map(c => `[${c.provider}] ${c.name} (${c.type})`).join(', ')
    );

    res.json(allChannels);
  } catch (err) {
    console.error(`[GATEWAY ERROR]`, err);
    console.error('[PaymentGateway] getAll error:', err.message);
    return res.status(500).json({ error: 'Failed to load payment channels' });
  }
};

exports.calculateFee = async (req, res) => {
    try {
        const { channel, amount, provider } = req.query;
        const totalAmount = parseInt(amount || 0);
        
        const targetProvider = (provider || "").toLowerCase();
        const targetChannel = (channel || "").toLowerCase();

        console.log(`[FEE DEBUG] Calculating for: ${targetProvider} | Channel: ${targetChannel} | Amount: ${totalAmount}`);

        if (targetProvider === 'tripay' && targetChannel) {
            const tripayData = await TripayService.getPaymentChannels();
            if (tripayData && tripayData.success) {
                // Cari channel dengan case-insensitive
                const ch = tripayData.data.find(c => String(c.code).toLowerCase() === targetChannel);
                
                if (ch) {
                    // Cek fee_customer dulu, kalau 0 baru cek fee_merchant
                    const flat = parseInt(ch.fee_customer?.flat || ch.fee_merchant?.flat || 0);
                    const percent = parseFloat(ch.fee_customer?.percent || ch.fee_merchant?.percent || 0) / 100;
                    
                    fee = Math.ceil(flat + (totalAmount * percent));
                    console.log(`[FEE DEBUG] Found Tripay Channel: ${ch.code} | Flat: ${flat} | Percent: ${percent * 100}% | Fee: ${fee}`);
                } else {
                    console.log(`[FEE DEBUG] Tripay Channel NOT FOUND for: ${targetChannel}`);
                }
            } else {
                console.log(`[FEE DEBUG] Tripay Service Error or No Data`);
            }
        }
        // Provider lain (prismalink, manual, wallet) otomatis fee = 0

        res.json({ 
            success: true, 
            data: {
                fee: fee,
                total_fee: fee,
                total_amount: totalAmount + fee
            }
        });
    } catch (err) {
        console.error("[Fee Calculation Error]:", err.message);
        res.status(500).json({ error: err.message });
    }
};

// --- ADMIN FUNCTIONS ---

exports.getAllAdmin = async (req, res) => {
    try {
        const results = await db.pool.query("SELECT * FROM payment_gateways");
        res.json(results.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTripayBalance = async (req, res) => {
    res.json({ success: true, balance: 0 });
};



exports.getTripayChannels = async (req, res) => {
    try {
        const result = await TripayService.getPaymentChannels();
        if (result.success) {
            return res.json({ success: true, data: result.data });
        }
        return res.status(400).json({ success: false, message: result.error });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.update = async (req, res) => {
  const { provider } = req.params;
  const data = req.body;
  
  try {
    const is_active = data.is_active || false;
    const api_key = data.api_key || data.key_id || "";
    const merchant_code = data.merchant_id || data.merchant_code || "";
    const private_key = data.secret_key || data.private_key || data.store_key || "";
    const webhook_url = data.backend_callback || data.webhook_url || "";
    const frontend_callback = data.frontend_callback || "";
    const mode = data.mode || "production";
    
    let enabledMethodsStr = "[]";
    if (data.enabled_methods) {
        enabledMethodsStr = typeof data.enabled_methods === 'string' ? data.enabled_methods : JSON.stringify(data.enabled_methods);
    }
    
    let enabledBanksStr = "{}";
    if (data.enabled_banks) {
        enabledBanksStr = typeof data.enabled_banks === 'string' ? data.enabled_banks : JSON.stringify(data.enabled_banks);
    }

    // Use ILIKE for case-insensitive check
    const checkRes = await db.pool.query("SELECT id FROM payment_gateways WHERE provider ILIKE $1", [provider]);
    
    if (checkRes.rows.length > 0) {
        // Update the existing record using ILIKE or targeting the specific ID
        await db.pool.query(`
            UPDATE payment_gateways SET 
                is_active = $1,
                api_key = $2,
                merchant_code = $3,
                private_key = $4,
                webhook_url = $5,
                frontend_callback = $6,
                enabled_methods = $7,
                enabled_banks = $8,
                mode = $9,
                updated_at = NOW()
            WHERE provider ILIKE $10
        `, [is_active, api_key, merchant_code, private_key, webhook_url, frontend_callback, enabledMethodsStr, enabledBanksStr, mode, provider]);
        console.log(`[GATEWAY] Updated settings for provider: ${provider}`);
    } else {
        await db.pool.query(`
            INSERT INTO payment_gateways (
                provider, is_active, api_key, merchant_code, private_key, 
                webhook_url, frontend_callback, enabled_methods, enabled_banks, mode, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        `, [provider.toLowerCase(), is_active, api_key, merchant_code, private_key, webhook_url, frontend_callback, enabledMethodsStr, enabledBanksStr, mode]);
        console.log(`[GATEWAY] Created new settings for provider: ${provider}`);
    }

    res.status(200).json({ success: true, message: 'Settings updated' });
  } catch (err) {
    console.error('[DEBUG] Update Error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

// --- MANUAL CRUD ---

exports.createManual = async (req, res) => {
    const data = req.body;
    try {
        await db.pool.query(`
            INSERT INTO payment_gateways (
                provider, gateway_type, bank_name, account_number, 
                account_holder, instructions, qris_url, logo_url, is_active,
                created_at, updated_at
            )
            VALUES ('manual', $1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
            data.gateway_type, data.bank_name, data.account_number,
            data.account_holder, data.instructions, data.qris_url, data.logo_url,
            data.is_active || false
        ]);
        res.json({ success: true, message: 'Manual payment created' });
    } catch (err) {
        console.error('[Manual Create Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.updateManual = async (req, res) => {
    const { id } = req.params;
    const data = req.body;
    try {
        await db.pool.query(`
            UPDATE payment_gateways SET 
                gateway_type = $1,
                bank_name = $2,
                account_number = $3,
                account_holder = $4,
                instructions = $5,
                qris_url = $6,
                logo_url = $7,
                is_active = $8,
                updated_at = NOW()
            WHERE id = $9 AND provider = 'manual'
        `, [
            data.gateway_type, data.bank_name, data.account_number,
            data.account_holder, data.instructions, data.qris_url, data.logo_url,
            data.is_active, id
        ]);
        res.json({ success: true, message: 'Manual payment updated' });
    } catch (err) {
        console.error('[Manual Update Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};

exports.deleteManual = async (req, res) => {
    const { id } = req.params;
    try {
        await db.pool.query("DELETE FROM payment_gateways WHERE id = $1 AND provider = 'manual'", [id]);
        res.json({ success: true, message: 'Manual payment deleted' });
    } catch (err) {
        console.error('[Manual Delete Error]:', err.message);
        res.status(500).json({ error: err.message });
    }
};
