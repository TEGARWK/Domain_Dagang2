const db = require('../config/db');
const TripayService = require('../services/TripayService');
const WalletService = require('../services/WalletService');
const { getIPv4 } = require('../utils/ipHelper');
const referralService = require('../services/referralService');
const VoucherService = require('../services/VoucherService');
const OrderService = require('../services/OrderService');


/**
 * Handle Closed Payment (e.g. Domain Checkout)
 */
exports.createClosedTransaction = async (req, res) => {
    try {
        let { invoice_number, payment_channel } = req.body;
        
        if (!invoice_number || !payment_channel) {
            return res.status(400).json({ success: false, message: "Invoice number dan payment channel wajib diisi" });
        }

        // Clean payment_channel from suffixes like '_tripay' added by frontend/gateway list
        payment_channel = payment_channel.replace('_tripay', '').toUpperCase();

        // 1. Validasi Status Channel di Database Lokal (Security Check)
        const gatewayRes = await db.pool.query("SELECT * FROM payment_gateways WHERE provider = 'tripay' LIMIT 1");
        const adminConfig = gatewayRes.rows[0];

        if (!adminConfig || adminConfig.is_active === false) {
            return res.status(403).json({ success: false, message: "Metode pembayaran Tripay sedang dinonaktifkan oleh admin" });
        }

        const enabledBanks = typeof adminConfig.enabled_banks === 'object' ? adminConfig.enabled_banks : JSON.parse(adminConfig.enabled_banks || '{}');
        const enabledMethods = Array.isArray(adminConfig.enabled_methods) ? adminConfig.enabled_methods : JSON.parse(adminConfig.enabled_methods || '[]');
        
        // Cek kategori (Group) dari channel
        // Mapping sederhana untuk mencocokkan kode dengan kategori
        const getChannelGroup = (code) => {
            const c = code.toUpperCase();
            if (c.startsWith('QRIS')) return 'QRIS';
            if (['OVO', 'DANA', 'SHOPEEPAY', 'GOPAY', 'LINKAJA'].includes(c)) return 'EWALLET';
            if (c.includes('VA') || ['BCA', 'BNI', 'BRI', 'MANDIRI', 'PERMATA', 'BSI', 'DANAMON', 'CIMB'].some(b => c.includes(b))) return 'VA';
            return 'RETAIL';
        };

        const channelGroup = getChannelGroup(payment_channel);
        const isGroupAllowed = enabledMethods.includes(channelGroup);
        
        // Sekarang enabledBanks adalah FLAT ARRAY dari baris 32 (jika format baru)
        // Kita dukung dua format (Objek lama & Flat Array baru) untuk transisi yang mulus
        let banksInGroup = [];
        if (Array.isArray(enabledBanks)) {
            banksInGroup = enabledBanks.map(b => b.toUpperCase());
        } else {
            banksInGroup = (enabledBanks[channelGroup] || []).map(b => b.toUpperCase());
        }

        const chCode = payment_channel.toUpperCase();
        const cleanChCode = chCode.replace('VA', '');

        const isBankAllowed = banksInGroup.some(dbBank => 
            dbBank === chCode || 
            dbBank === cleanChCode ||
            (dbBank + 'VA') === chCode ||
            (channelGroup === 'QRIS' && dbBank.startsWith('QRIS'))
        );

        if (!isGroupAllowed || !isBankAllowed) {
            console.warn(`[Tripay] 🚫 Security Check Failed: ${payment_channel} (Group: ${channelGroup}). Allowed Groups: ${enabledMethods.join(',')}, Allowed Banks in DB: ${banksInGroup.join(',')}`);
            return res.status(400).json({ 
                success: false, 
                message: `Metode pembayaran ${payment_channel} sedang tidak tersedia di gateway Tripay Anda. Silakan cek konfigurasi Admin.` 
            });
        }

        // 2. Cek Invoice
        const invRes = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [invoice_number]);
        const invoice = invRes.rows[0];

        if (!invoice) return res.status(404).json({ success: false, message: `Invoice ${invoice_number} tidak ditemukan` });
        if (invoice.status === 'PAID') return res.status(400).json({ success: false, message: "Invoice sudah dibayar" });

        const baseInvoiceTotal = Math.floor(parseFloat(invoice.total));
        if (!baseInvoiceTotal || baseInvoiceTotal <= 0) {
            return res.status(400).json({ success: false, message: "Amount invoice tidak valid atau nol" });
        }

        // --- HITUNG FEE LAYANAN SEBELUMNYA ---
        let serviceFee = 0;
        try {
            const feeRes = await TripayService.getFeeCalculation(payment_channel, baseInvoiceTotal);
            if (feeRes.success) {
                serviceFee = feeRes.data.fee_customer || 0;
            }
        } catch (feeErr) {
            console.warn("⚠️ [Tripay] Failed to calculate fee:", feeErr.message);
        }

        const transactionAmount = baseInvoiceTotal + serviceFee;

        // 3. Ambil User
        const userRes = await db.pool.query('SELECT * FROM users WHERE id = $1', [invoice.user_id]);
        const user = userRes.rows[0];
        if (!user) return res.status(404).json({ success: false, message: `User untuk invoice ini tidak ditemukan (user_id: ${invoice.user_id})` });

        // 4. Ambil Items invoice
        const itemsRes = await db.pool.query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoice_number]);
        const items = itemsRes.rows;

        const totalDiscount = parseFloat(invoice.total_discount || 0);

        // Mapping order_items
        let orderItems = items.map(item => {
            const qty = item.quantity || 1;
            const price = Math.floor(parseFloat(item.price));
            return {
                sku: item.id.toString(),
                name: item.name,
                price: price,
                quantity: qty,
                subtotal: price * qty,
                product_url: '',
                image_url: ''
            };
        });

        // Apply Discount to items (Tripay doesn't allow negative line items)
        if (totalDiscount > 0) {
            let remainingDiscount = totalDiscount;
            for (let i = 0; i < orderItems.length; i++) {
                if (remainingDiscount <= 0) break;
                const canSubtract = orderItems[i].subtotal - 1; // Keep at least Rp 1
                const toSubtract = Math.min(remainingDiscount, canSubtract);
                
                orderItems[i].subtotal -= toSubtract;
                orderItems[i].price = Math.floor(orderItems[i].subtotal / orderItems[i].quantity);
                remainingDiscount -= toSubtract;
            }
        }

        // Recalculate current sum
        const currentSum = orderItems.reduce((acc, curr) => acc + curr.subtotal, 0);

        // Add Tax and Fee as a single adjustment line (it will always be positive)
        const totalDiff = transactionAmount - currentSum;
        if (totalDiff > 0) {
            orderItems.push({
                sku: 'TAX-FEE',
                name: 'Pajak (PPN) & Biaya Layanan',
                price: totalDiff,
                quantity: 1,
                subtotal: totalDiff,
                product_url: '',
                image_url: ''
            });
        }

        const merchantRef = `${invoice_number}-${Date.now()}`; // Unique ref per attempt to allow method changes
        
        // --- HITUNG EXPIRED TIME DINAMIS ---
        let expiryMinutes = 1440; // Default 24 Jam
        const pChannel = payment_channel.toUpperCase();

        if (pChannel.includes('QRIS') || ['OVO', 'DANA', 'SHOPEEPAY', 'GOPAY', 'LINKAJA'].includes(pChannel)) {
            expiryMinutes = 60; // QRIS & E-Wallet: 1 Jam
        } else if (pChannel === 'MUAMALATVA' || pChannel === 'BSIVA') {
            expiryMinutes = 180; // VA Khusus Max 3 Jam
        } else if (pChannel.includes('ALFAMART') || pChannel.includes('INDOMARET') || pChannel.includes('ALFAMIDI')) {
            expiryMinutes = 1440; // Retail: 24 Jam
        }

        const expiredTime = Math.floor(Date.now() / 1000) + (expiryMinutes * 60);
        console.log(`[Tripay] ⏱️ Expiry set to ${expiryMinutes} minutes for channel ${payment_channel}`);

        const payload = {
            method: payment_channel,
            merchant_ref: merchantRef,
            amount: transactionAmount,
            customer_name: user.name || 'Customer',
            customer_email: user.email || 'customer@example.com',
            customer_phone: user.phone || '08000000000',
            order_items: orderItems,
            expired_time: expiredTime,
            return_url: process.env.CLIENT_URL ? `${process.env.CLIENT_URL}/payment/${invoice_number}` : undefined
        };

        // --- DEBUG LOG: Payload ke Tripay ---
        console.log(`[Tripay] 📤 Mengirim payload ke Tripay untuk invoice ${invoice_number}:`, JSON.stringify(payload, null, 2));

        const result = await TripayService.createClosedTransaction(payload);

        // --- DEBUG LOG: Response dari Tripay ---
        console.log(`[Tripay] 📥 Response dari Tripay:`, JSON.stringify(result, null, 2));

        if (!result.success) {
            console.error(`[Tripay] ❌ Ditolak Tripay untuk invoice ${invoice_number}:`, result);
            return res.status(400).json({
                success: false,
                message: result.raw?.message || result.message || "Permintaan ditolak oleh Tripay",
                details: result.raw || null
            });
        }

        // --- EXTRACT DATA DARI TRIPAY ---
        const tData = result.data?.data;
        if (!tData) {
            console.error("[Tripay] ❌ Response Tripay sukses tapi tData kosong:", result.data);
            return res.status(500).json({
                success: false,
                message: "Format response Tripay tidak dikenali (data transaksi kosong).",
                details: "Silakan cek log server untuk detail mentah."
            });
        }

        // --- MAPPING FIELD SESUAI CHANNEL (Dokumentasi Tripay) ---
        // 1. VA / Retail: pay_code
        // 2. Redirect (E-Wallet): pay_url
        // 3. QRIS: qr_url atau qr_string
        const mappedVaNumber = tData.pay_code || null;
        const mappedPayUrl   = tData.pay_url || tData.qr_url || tData.checkout_url || null;
        const transType      = invoice_number.startsWith('TOPUP-') ? 'TOPUP' : 'DOMAIN';
        // merchantRef sudah dideklarasikan di baris 84

        console.log(`[Tripay] 📝 Mapping data untuk DB: va_number=${mappedVaNumber}, pay_url=${mappedPayUrl}, type=${transType}`);

        // Simpan ke DB tabel payments
        await db.pool.query(`
            INSERT INTO payments (
                invoice_number,
                transaction_id,
                amount,
                payment_method,
                status,
                raw_response,
                va_number,
                pay_url,
                tripay_reference,
                expired_at,
                transaction_type
            )
            VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8, to_timestamp($9), $10)
            ON CONFLICT (transaction_id) DO UPDATE SET
                payment_method = EXCLUDED.payment_method,
                amount = EXCLUDED.amount,
                raw_response = EXCLUDED.raw_response,
                va_number = EXCLUDED.va_number,
                pay_url = EXCLUDED.pay_url,
                tripay_reference = EXCLUDED.tripay_reference,
                expired_at = EXCLUDED.expired_at,
                updated_at = NOW()
        `, [
            invoice_number,
            merchantRef,
            transactionAmount,
            payment_channel,
            JSON.stringify(tData),
            mappedVaNumber,
            mappedPayUrl,
            tData.reference,
            tData.expired_time,
            transType
        ]);

        console.log(`[Tripay] ✅ Data tersimpan di DB. Mengirim response sukses ke frontend.`);

        // Kembalikan data yang dibutuhkan frontend untuk redirect/display
        return res.status(200).json({
            success: true,
            message: "Transaksi berhasil dibuat",
            data: {
                ...tData,
                // Pastikan field-field penting selalu ada di level atas
                pay_code: mappedVaNumber,
                pay_url: mappedPayUrl,
                qr_url: tData.qr_url || null,
                qr_string: tData.qr_string || null,
                expired_at: tData.expired_time,
                amount: tData.amount,
                merchant_ref: tData.merchant_ref
            }
        });

    } catch (err) {
        console.error("[Tripay] ❌ unhandled error di createClosedTransaction:");
        console.error(err);

        return res.status(500).json({
            success: false,
            message: "Gagal memproses pembayaran (Backend Error)",
            error: err.message,
            // Kembalikan stack trace pendek khusus untuk admin debug
            details: err.stack?.split('\n')[1]?.trim() || null
        });
    }
};

/**
 * Handle Open Payment (e.g. Wallet Top Up where user can decide amount via VA)
 */
exports.createOpenTransaction = async (req, res) => {
    try {
        const { payment_channel, title, userId } = req.body;
        
        if (!payment_channel) return res.status(400).json({ success: false, message: "Payment channel is required" });
        if (!userId) return res.status(400).json({ success: false, message: "User ID is required" });

        const userRes = await db.pool.query(`SELECT * FROM users WHERE id = $1`, [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
        const user = userRes.rows[0];

        const merchantRef = `OPN-${Date.now()}`;
        
        const payload = {
            method: payment_channel,
            merchant_ref: merchantRef,
            customer_name: user.name || 'Customer',
            signature: "" // Handled by service
        };

        const result = await TripayService.createOpenTransaction(payload);

        if (!result.success) {
            console.error("❌ Tripay Open Payment Rejected:", result);
            return res.status(400).json({
                success: false,
                message: result.raw?.message || "Ditolak oleh Tripay",
                details: result.raw
            });
        }
        
        const tData = result.data.data;
        
        // We might want to store open payment UUID mapping somewhere.
        // For now, we will create a dummy invoice or just return the UUID for frontend to instruct user to top up.
        // Since we need to trace it when webhook comes, we'll need to store the uuid.
        
        return res.status(200).json({
            success: true,
            data: {
                uuid: tData.uuid,
                merchant_ref: tData.merchant_ref,
                pay_code: tData.pay_code,
                pay_url: tData.pay_url
            }
        });

    } catch (err) {
        console.error("Tripay Open Payment Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Handle Webhook Notification from Tripay
 */
exports.handleWebhook = async (req, res) => {
    try {
        // Validation Callback Signature
        const incomingSignature = req.headers['x-callback-signature'];
        const validSignature = await TripayService.generateCallbackSignature(req.rawBody || req.body);
        
        if (incomingSignature !== validSignature) {
            console.warn("⚠️ [Tripay Webhook] Invalid Signature detected!");
            return res.status(400).json({ success: false, message: "Invalid Signature" });
        }

        const data = req.body;
        console.log("🔔 [Tripay Webhook] Received:", data);

        // Check Event
        if (req.headers['x-callback-event'] === 'payment_status') {
            const status = data.status; // PAID, EXPIRED, FAILED
            const reference = data.reference;
            const merchantRef = data.merchant_ref;

            if (status === 'PAID') {
                // 1. Ambil data payment & invoice (LOCK FOR UPDATE)
                const payRes = await db.pool.query(
                    'SELECT * FROM payments WHERE transaction_id = $1 OR tripay_reference = $2 FOR UPDATE', 
                    [merchantRef, reference]
                );
                const payment = payRes.rows[0];

                if (!payment) {
                    console.warn(`⚠️ [Tripay Webhook] Payment not found: Ref ${reference}`);
                    return res.status(200).json({ success: true });
                }

                if (payment.status === 'PAID') {
                    console.log(`ℹ️ [Tripay Webhook] Payment ${reference} already processed as PAID.`);
                    return res.status(200).json({ success: true });
                }

                // 2. Fetch Invoice
                const invRes = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [payment.invoice_number]);
                const invoice = invRes.rows[0];

                if (!invoice) {
                    console.error(`❌ [Tripay Webhook] Invoice ${payment.invoice_number} not found!`);
                    return res.status(200).json({ success: true });
                }

                await db.pool.query('BEGIN');
                try {
                    // 3. Update Status Payment & Invoice
                    await db.pool.query(
                        'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
                        ['PAID', payment.id]
                    );

                    await db.pool.query(
                        'UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2',
                        ['paid', invoice.id]
                    );

                    // 4. Handle Topup logic via WalletService
                    const itemRes = await db.pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoice.id]);
                    const items = itemRes.rows;
                    const isTopUp = invoice.type === 'TOPUP' || invoice.id.startsWith('TOPUP-') || items.some(it => it.action_type === 'topup' || (it.name || '').toLowerCase().includes('top up'));

                    if (isTopUp) {
                        console.log(`💰 [Tripay Webhook] Topup detected. Crediting ${invoice.total} to UserID: ${invoice.user_id}`);
                        await WalletService.credit(
                            invoice.user_id, 
                            parseFloat(invoice.total), 
                            'TOPUP', 
                            invoice.id, 
                            'Top Up Wallet via Tripay'
                        );
                    } else {
                        console.log(`✅ [Tripay Webhook] Service Payment processed: ${invoice.id}`);
                        // Future: Add domain activation triggering if needed here 
                        // (Usually handled via callback or service layer separately)
                    }

                    await db.pool.query('COMMIT');
                    console.log(`✅ [Tripay Webhook] Success Payment for Invoice: ${invoice.id}`);

                    // Trigger Referral Reward (Async)
                    referralService.processReferralReward(invoice.id)
                        .catch(err => console.error("Referral Reward Error:", err));

                    // Finalize Coupon Usage (Success)
                    await VoucherService.finalizeVoucherUsage(invoice.id, db.pool);

                    // Trigger Domain Activation (Async)
                    if (invoice.type !== 'TOPUP' && !invoice.id.startsWith('TOPUP-')) {
                        console.log(`🚀 [Tripay Webhook] Triggering Domain Activation for: ${invoice.id}`);
                        OrderService.activateDomain(invoice.id)
                            .then(res => console.log(`[Tripay Webhook] Domain Activation Result for ${invoice.id}:`, res))
                            .catch(err => console.error(`[Tripay Webhook] Domain Activation Error for ${invoice.id}:`, err));
                    }


                    return res.status(200).json({ success: true });

                } catch (innerErr) {
                    await db.pool.query('ROLLBACK');
                    console.error("❌ [Tripay Webhook] DB Update Error:", innerErr);
                    return res.status(500).json({ success: false, message: "Database Error" });
                }
            } else if (status === 'EXPIRED' || status === 'FAILED') {
                const payRes = await db.pool.query('SELECT * FROM payments WHERE transaction_id = $1 OR tripay_reference = $2', [merchantRef, reference]);
                const payment = payRes.rows[0];
                if (payment) {
                    await db.pool.query(
                        'UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2',
                        [status, payment.id]
                    );

                    // Finalize Coupon Usage (Expired / Failed)
                    // (REMOVED: Coupon Finalization - System reset)
                }
                return res.status(200).json({ success: true });
            }
        }
        
        // Return 200 OK for any other events handled
        return res.status(200).json({ success: true });

    } catch (err) {
        console.error("❌ Tripay Webhook Error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Manual Status Check
 */
exports.checkStatus = async (req, res) => {
    try {
        const { reference } = req.params;
        const result = await TripayService.checkTransactionStatus(reference);
        
        if (result.success && result.data?.status === 'PAID') {
             const tData = result.data;
             const payRes = await db.pool.query('SELECT * FROM payments WHERE tripay_reference = $1 FOR UPDATE', [reference]);
             const payment = payRes.rows[0];

             if (payment && payment.status !== 'PAID') {
                 const invRes = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [payment.invoice_number]);
                 const invoice = invRes.rows[0];
                 
                 if (invoice) {
                    await db.pool.query('BEGIN');
                    try {
                        await db.pool.query('UPDATE payments SET status = $1, updated_at = NOW() WHERE id = $2', ['PAID', payment.id]);
                        await db.pool.query('UPDATE invoices SET status = $1, updated_at = NOW() WHERE id = $2', ['paid', invoice.id]);
                        
                        const itemRes = await db.pool.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoice.id]);
                        const items = itemRes.rows;
                        const isTopUp = invoice.type === 'TOPUP' || invoice.id.startsWith('TOPUP-') || items.some(it => it.action_type === 'topup' || (it.name || '').toLowerCase().includes('top up'));

                        if (isTopUp) {
                            console.log(`💰 [Tripay StatusCheck] Sync Topup. Crediting ${invoice.total} to UserID: ${invoice.user_id}`);
                            await WalletService.credit(
                                invoice.user_id, 
                                parseFloat(invoice.total), 
                                'TOPUP', 
                                invoice.id, 
                                'Top Up via Tripay Check'
                            );
                        }
                        await db.pool.query('COMMIT');
                        console.log(`💎 [Tripay StatusCheck] Database sync completed for: ${invoice.id}`);

                        // Finalize Coupon Usage (Success)
                        await VoucherService.finalizeVoucherUsage(invoice.id, db.pool);

                        // Trigger Domain Activation (Async)
                        if (invoice.type !== 'TOPUP' && !invoice.id.startsWith('TOPUP-')) {
                            console.log(`🚀 [Tripay StatusCheck] Triggering Domain Activation for: ${invoice.id}`);
                            OrderService.activateDomain(invoice.id)
                                .then(res => console.log(`[Tripay StatusCheck] Domain Activation Result for ${invoice.id}:`, res))
                                .catch(err => console.error(`[Tripay StatusCheck] Domain Activation Error for ${invoice.id}:`, err));
                        }
                    } catch (innerErr) {
                        await db.pool.query('ROLLBACK');
                        console.error("Status check sync error:", innerErr);
                    }
                 }
             }
        }

        return res.status(200).json(result);
    } catch (err) {
        console.error("Tripay Status Check Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};

/**
 * Get Available Channels from Tripay
 */
exports.getPaymentChannels = async (req, res) => {
    try {
        const channels = await TripayService.getPaymentChannels();
        return res.status(200).json(channels);
    } catch (err) {
        console.error("Get Payment Channels Error:", err);
        return res.status(500).json({ success: false, message: err.message });
    }
};
