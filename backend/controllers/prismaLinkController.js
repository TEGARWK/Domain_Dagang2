const PrismaLinkService = require('../services/PrismaLinkService');
const db = require('../config/db');
const { getIPv4 } = require('../utils/ipHelper');

const OrderService = require('../services/OrderService');
const TransferController = require('./transferController');
const EmailService = require('../services/EmailService');
const { createLog } = require('./auditController');

/**
 * Handle incoming webhook from PrismaLink
 */


/**
 * Helper: Log Activity (Delegated to OrderService for consistency, or keep local if simple)
 */
const logActivity = async (client, invoiceId, action, description = '') => {
    try {
        await client.query(
            `INSERT INTO activity_logs (invoice_id, action, description) VALUES ($1, $2, $3)`,
            [invoiceId, action, description]
        );
    } catch (e) {
        console.error("Failed to log activity:", e);
    }
};

const DaftarnamaService = require('../services/DaftarnamaService');

const handleWebhook = async (req, res) => {
    try {


        const signatureValid = PrismaLinkService.validateSignature(req.headers, req.body);
        
        if (!signatureValid) {
            console.warn(`[Webhook] Signature Invalid. IP: ${req.ip}`);
            console.warn("Expected signature calculation triggered...");
            return res.status(401).json({ message: "Invalid Signature" });
        }

        const data = req.body;
        const { merchant_ref_no, transaction_status, transaction_amount, plink_ref_no } = data;
        let invoice_number = data.invoice_number;



        // 1. Mandatory lookup: Get invoice_number from DB using merchant_ref_no
        const paymentCheckQuery = `SELECT invoice_number, status, amount FROM payments WHERE transaction_id = $1`;
        const paymentCheckResult = await db.pool.query(paymentCheckQuery, [merchant_ref_no]);
        
        if (paymentCheckResult.rows.length === 0) {
            console.error(`[Webhook] Transaction not found for ref: ${merchant_ref_no}`);
            return res.status(404).json({ message: "Transaction Not Found" });
        }

        const paymentRecord = paymentCheckResult.rows[0];
        invoice_number = paymentRecord.invoice_number;


        if (paymentRecord.status === 'PAID') {
            return res.status(200).json({ status: "OK", message: "Already Processed" });
        }

        // 2. Validate Invoice
        const invoiceQuery = `SELECT id, total, status, coupon_code, user_id FROM invoices WHERE id = $1`;
        const invoiceResult = await db.pool.query(invoiceQuery, [invoice_number]);

        if (invoiceResult.rows.length === 0) {
            console.error(`[Webhook] Invoice not found in DB: ${invoice_number}`);
            return res.status(400).json({ message: "Invoice Not Found" });
        }

        const invoice = invoiceResult.rows[0];
        if (parseFloat(invoice.total) !== parseFloat(transaction_amount)) {
             console.error(`[Webhook] Amount Mismatch! Invoice: ${invoice.total}, Webhook: ${transaction_amount}`);
             // Proceeding but logging error
        }

        // 3. Determine New Status
        let newStatus = 'PENDING';
        let invoiceStatus = 'pending';

        if (data.response_code === '00' || data.response_code === 'PL000' || data.transaction_status === 'Settlement' || data.transaction_status === 'Success' || data.transaction_status === 'SETLD') {
            newStatus = 'PAID';
            invoiceStatus = 'paid';
        } else if (data.response_code === '05' || data.transaction_status === 'Failed') {
            newStatus = 'FAILED';
            invoiceStatus = 'pending'; 
        }

        // 4. Update Database (Transaction)
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            const upsertPayment = `
                INSERT INTO payments (invoice_number, transaction_id, amount, payment_method, status, raw_response, plink_ref_no)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (transaction_id) 
                DO UPDATE SET status = EXCLUDED.status, raw_response = EXCLUDED.raw_response, plink_ref_no = EXCLUDED.plink_ref_no, updated_at = NOW()
            `;
            
            await client.query(upsertPayment, [
                invoice_number,
                merchant_ref_no,
                transaction_amount,
                data.payment_channel || 'Unknown',
                newStatus,
                JSON.stringify(data),
                plink_ref_no || null
            ]);

            if (newStatus === 'PAID') {
                if (invoice.status !== 'paid') {
                    await client.query(`UPDATE invoices SET status = $1 WHERE id = $2`, [invoiceStatus, invoice_number]);
                    console.log(`[Webhook] Invoice ${invoice_number} updated to PAID`);
                    
                    // Increment Coupon Usage
                    if (invoice.coupon_code) {
                        try {
                            await client.query(`UPDATE coupons SET usage_count = usage_count + 1 WHERE code = $1`, [invoice.coupon_code]);
                            console.log(`[Webhook] Coupon ${invoice.coupon_code} usage incremented.`);
                        } catch (cpErr) {
                            console.error(`[Webhook] Failed to increment coupon usage:`, cpErr);
                        }
                    }

                    // Log Activity
                    await logActivity(client, invoice_number, "Pembayaran Berhasil", `Via Webhook (${data.payment_channel})`);

                    // Audit Log: Payment Successful
                    await createLog({
                        user_id: invoice.user_id,
                        action: 'PAYMENT_SUCCESS',
                        entity_type: 'invoice',
                        entity_id: invoice_number,
                        new_value: { amount: invoice.total, method: data.payment_channel },
                        req
                    });


                    // Activate Domain OR Transfer OR TopUp
                    // Check items to see if it's a TopUp
                    const itemCheck = await client.query("SELECT id, action_type FROM invoice_items WHERE invoice_id = $1 LIMIT 1", [invoice_number]);
                    const isTopUp = itemCheck.rows.length > 0 && itemCheck.rows[0].action_type === 'topup';

                    // Check if this invoice is for transfer
                    const transferCheck = await client.query("SELECT id FROM transfer_requests WHERE invoice_id = $1", [invoice_number]);
                    
                    const WalletService = require('../services/WalletService'); // Lazy load
                    const NotificationService = require('../services/NotificationService'); // Lazy load

                    // Capture values needed for setImmediate
                    const userId = invoice.user_id;
                    const invoiceTotal = invoice.total;
                    const actionType = itemCheck.rows[0]?.action_type || 'register';
                    const isTransfer = transferCheck.rows.length > 0;

                    setImmediate(async () => {
                        try {
                            if (isTopUp) {
                                console.log(`[Webhook] Processing TOPUP for invoice ${invoice_number}`);
                                await WalletService.credit(userId, invoiceTotal, 'TOPUP', invoice_number, 'Top Up via PrismaLink');
                                
                                // NOTIFICATION: Top Up Success
                                await NotificationService.createNotification(userId, 
                                    "Top Up Berhasil", 
                                    `Saldo wallet Anda sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(invoiceTotal)} berhasil ditambahkan.`, 
                                    'success', invoice_number, 'wallet_topup');
                                // It's a transfer!
                                TransferController.processTransfer(invoice_number);
                                
                                // NOTIFICATION: Transfer Processing
                                await NotificationService.createNotification(userId, 
                                    "Transfer Diproses", 
                                    "Pembayaran berhasil. Proses transfer domain Anda sedang diproses oleh tim kami.", 
                                    'info', invoice_number, 'domain_transfer');
                            } else {
                                // Normal registration or renewal
                                OrderService.activateDomain(invoice_number);
                                
                                if (actionType === 'renew') {
                                    await NotificationService.createNotification(userId, 
                                        "Perpanjangan Berhasil", 
                                        "Pembayaran diterima. Domain Anda sedang dalam proses perpanjangan otomatis.", 
                                        'success', invoice_number, 'domain_renewal');
                                } else {
                                    await NotificationService.createNotification(userId, 
                                        "Pembayaran Berhasil", 
                                        "Pembayaran untuk pendaftaran domain baru telah kami terima dan sedang diaktifkan.", 
                                        'success', invoice_number, 'domain_registration');
                                }
                            }
                        } catch (err) {
                            console.error(`[Webhook] Details Processing Failed: ${err.message}`);
                        }
                    });
                }
            }

            await client.query('COMMIT');

            res.status(200).json({ status: "OK" });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("[Webhook] Error processing:", error.message);
        console.error(error.stack);
        res.status(500).json({ message: "Internal Server Error" });
    }
};

/**
 * Initiate Payment (Called by Frontend)
 */
const createTransaction = async (req, res) => {
    try {
        const { invoice_number, payment_method } = req.body;


        // 1. Get Invoice Data
        const invoiceRes = await db.pool.query(`SELECT * FROM invoices WHERE id = $1`, [invoice_number]);
        if (invoiceRes.rows.length === 0) {
            return res.status(404).json({ message: "Invoice not found" });
        }
        const invoice = invoiceRes.rows[0];

        // 2. Validate Invoice Status
        if (invoice.status === 'paid') {
             return res.status(400).json({ message: "Invoice already paid" });
        }

        // Customer details
        const userRes = await db.pool.query(`SELECT * FROM users WHERE id = $1`, [invoice.user_id]);
        const user = userRes.rows[0] || {};
        
        // Invoice Items
        const itemsRes = await db.pool.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [invoice_number]);
        const items = itemsRes.rows;

        // 3. Prepare Data for PrismaLink
        const paymentData = {
            invoice_number: invoice.id,
            amount: invoice.total,
            user_id: user.id || 0,
            user_name: user.name || "Customer",
            user_email: user.email || "customer@example.com",
            user_phone: user.phone || "08123456789",
            user_address: user.address || "Alamat belum diatur",
            user_ip_address: getIPv4(req),
            user_device_id: (req.headers['user-agent'] || "WEB-BROWSER").substring(0, 50),
            bank_code: req.body.bank_code || null, // Capture bank code (e.g. "BCA", "BNI")
            payment_channel: req.body.payment_channel || "VA", // "VA" or "QRIS"
            items: items.map(i => ({
                id: i.id,
                name: i.name,
                price: i.price
            }))
        };

        // 4. Call Service
        const result = await PrismaLinkService.createPayment(paymentData);

        // 5. Save Initial 'PENDING' state to DB
        const refNo = result.data.transaction_id || `TRX-${Date.now()}`;
        
        const vaNumber = result.data.va_number || null;
        const qrString = result.data.qr_string || null;
        const expiredAt = result.data.expired_at || null;

        try {
            // Kita simpan detail di kolom raw_response atau kolom khusus jika ada
            // Disini kita simpan di payment_method juga biar jelas (e.g. VA_BCA)
            const methodDetail = req.body.payment_channel === 'QRIS' ? 'QRIS' : `VA_${req.body.bank_code}`;

            await db.pool.query(`
                INSERT INTO payments (
                    invoice_number, 
                    transaction_id, 
                    amount, 
                    payment_method, 
                    status, 
                    raw_response, 
                    va_number, 
                    expired_at,
                    plink_ref_no
                )
                VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7, $8)
                ON CONFLICT (transaction_id) DO UPDATE SET 
                    status = EXCLUDED.status,
                    raw_response = EXCLUDED.raw_response,
                    va_number = EXCLUDED.va_number,
                    expired_at = EXCLUDED.expired_at,
                    plink_ref_no = EXCLUDED.plink_ref_no,
                    updated_at = NOW()
            `, [
                invoice_number, 
                refNo, 
                invoice.total, 
                methodDetail, 
                JSON.stringify(result.raw), // Simpan RAW response lengkap (isi plink_ref_no)
                vaNumber,
                expiredAt,
                result.data.plink_ref_no || null
            ]);

            // Log Initial Activity
            await db.pool.query(
                `INSERT INTO activity_logs (invoice_id, action, description) VALUES ($1, $2, $3)`,
                [invoice_number, "Menunggu Pembayaran", `Metode: ${req.body.payment_channel}`]
            );
        } catch (dbErr) {
            console.error("Failed to save initial payment record:", dbErr);
            console.error("SQL Prams:", [invoice_number, refNo, invoice.total]);
            // Non-blocking error logging
        }

        if (result.success) {
            // Audit Log: Payment Created
            await createLog({
                user_id: user.id || null, // Capture from auth if available, in createTransaction user is from req.user
                action: 'CHECKOUT_DOMAIN', 
                entity_type: 'invoice',
                entity_id: invoice_number,
                new_value: { items: items.map(i => i.name) },
                req
            });

            res.json({
                success: true,
                data: {
                    invoice_number: invoice_number,
                    transaction_id: refNo,
                    amount: result.data.amount,
                    expired_at: result.data.expired_at,
                    payment_method: req.body.payment_channel,
                    bank_code: req.body.bank_code,
                    // VA Data
                    va_number: vaNumber,
                    // QRIS Data
                    qr_string: qrString,
                    qr_image: result.data.qr_image
                }
            });
        } else {
             // MARK AS FAILED IN DB
             await db.pool.query(
                 `UPDATE payments SET status = 'FAILED' WHERE transaction_id = $1`, 
                 [refNo]
             );

             console.error("[PrismaLink] Create Failed:", result.raw);

             res.status(400).json({
                success: false, 
                message: "Gagal membuat pembayaran ke PrismaLink (" + (result.raw.response_description || result.raw.response_message || result.raw.message || "Unknown") + ")",
                details: result.raw
             });
        }
    } catch (error) {
        console.error("Create Transaction Error:", error);
        // If it's a PrismaLink API error (caught via axios), show the specific message
        const isApiError = error.response && error.response.data;
        const errMsg = isApiError ? (error.response.data.response_message || error.response.data.message) : error.message;
        const details = isApiError ? (error.response.data.response_description || error.response.data.details) : null;

        res.status(500).json({ 
            message: "Gagal membuat pembayaran: " + errMsg, 
            details: details,
            error: error.message 
        });
    }
};

/**
 * Check Invoice Status
 */
/**
 * Check Invoice Status (Hybrid: DB + Real-time Inquiry)
 */
const getStatus = async (req, res) => {
    try {
        const { invoice_number } = req.params;
        
        // 1. Check Invoice & Payment Record
        const result = await db.pool.query(`
            SELECT i.status as invoice_status, i.total, p.transaction_id, p.raw_response, p.status as payment_status
            FROM invoices i
            LEFT JOIN payments p ON i.id = p.invoice_number
            WHERE i.id = $1
            ORDER BY 
                CASE WHEN p.status = 'PAID' THEN 1 ELSE 2 END ASC,
                p.updated_at DESC
            LIMIT 1
        `, [invoice_number]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: "Invoice not found" });
        }

        const data = result.rows[0];

        // If already paid in DB, return immediately
        if (data.invoice_status === 'paid' || data.payment_status === 'PAID') {
             return res.json({
                invoice_number,
                status: 'PAID',
                amount: data.total
            });
        }

        // 2. Real-time Check to PrismaLink
        if (data.transaction_id) {
            try {
                // Extract plink_ref_no from raw_response if available
                let plinkRefNo = null;
                if (data.raw_response) {
                    const raw = typeof data.raw_response === 'string' ? JSON.parse(data.raw_response) : data.raw_response;
                    // Try to find plink_ref_no or transaction_id from Prismalink response
                    plinkRefNo = raw.plink_ref_no || raw.transaction_id || null;
                }


                
                const inquiryRes = await PrismaLinkService.checkStatus(data.transaction_id, plinkRefNo);
                
                // Map Result to Status
                // Success criteria: 
                // Webhook: '00', 'Settlement', 'Success'
                // Inquiry (Direct): 'PL000', 'SETLD', 'SUCCESS'
                if (inquiryRes && (
                    inquiryRes.transaction_status === 'Settlement' || 
                    inquiryRes.transaction_status === 'SETLD' ||
                    inquiryRes.transaction_status === 'PAID' ||
                    inquiryRes.transaction_status === 'SUCCESS' 
                )) {
                    
                    // UPDATE DB TO PAID
                    const client = await db.pool.connect();
                    try {
                        await client.query('BEGIN');
                        await client.query(`UPDATE invoices SET status = 'paid' WHERE id = $1`, [invoice_number]);
                        await client.query(`
                            UPDATE payments 
                            SET status = 'PAID', updated_at = NOW(), raw_response = $2, plink_ref_no = $3
                            WHERE transaction_id = $1
                        `, [data.transaction_id, JSON.stringify(inquiryRes), inquiryRes.plink_ref_no || null]);
                        
                        // Log Activity
                        await logActivity(client, invoice_number, "Pembayaran Berhasil", "Via Cek Status (Inquiry)");

                        // CRITICAL: Trigger Domain Activation
                        console.log(`[GetStatus] Triggering Fulfillment for invoice ${invoice_number} after successful Inquiry`);
                        OrderService.activateDomain(invoice_number);

                        // Increment Coupon Usage
                        const invCheck = await client.query(`SELECT coupon_code FROM invoices WHERE id = $1`, [invoice_number]);
                        const coupon_code = invCheck.rows[0]?.coupon_code;
                        if (coupon_code) {
                            await client.query(`UPDATE coupons SET usage_count = usage_count + 1 WHERE code = $1`, [coupon_code]);
                            console.log(`[GetStatus] Coupon ${coupon_code} usage incremented via Inquiry.`);
                        }

                        await client.query('COMMIT');
                        


                        // Dictionary check for action type
                        const itemCheck = await client.query("SELECT action_type FROM invoice_items WHERE invoice_id = $1 LIMIT 1", [invoice_number]);
                        const isTopUp = itemCheck.rows.length > 0 && itemCheck.rows[0].action_type === 'topup';

                        // Activate Domain OR Transfer
                        const transferCheck = await client.query("SELECT id FROM transfer_requests WHERE invoice_id = $1", [invoice_number]);
                        const WalletService = require('../services/WalletService');

                         setImmediate(async () => {
                            try {
                                if (isTopUp) {
                                    console.log(`[GetStatus] Processing TOPUP for invoice ${invoice_number}`);
                                    const inv = await client.query("SELECT user_id, total FROM invoices WHERE id = $1", [invoice_number]);
                                    if (inv.rows.length > 0) {
                                        const userId = inv.rows[0].user_id;
                                        const total = inv.rows[0].total;
                                        await WalletService.credit(userId, total, 'TOPUP', invoice_number, 'Top Up via PrismaLink');
                                        
                                        // Send Email
                                        const userRes = await client.query("SELECT name, email FROM users WHERE id = $1", [userId]);
                                        if (userRes.rows.length > 0) {
                                            const invoiceObj = { id: invoice_number, payment_method: 'PrismaLink' };
                                            EmailService.sendTopupSuccess(userRes.rows[0], invoiceObj, total).catch(e => console.error(e));
                                        }
                                    }
                                } else if (transferCheck.rows.length > 0) {
                                    TransferController.processTransfer(invoice_number);
                                } else {
                                    OrderService.activateDomain(invoice_number);
                                }
                            } catch (err) {
                                console.error(`[GetStatus] Logic Error: ${err.message}`);
                            }
                        });


                        return res.json({
                            invoice_number,
                            status: 'PAID',
                            amount: data.total
                        });

                    } catch (err) {
                        await client.query('ROLLBACK');
                        console.error("Failed to update status in DB:", err);
                    } finally {
                        client.release();
                    }
                } 
            } catch (apiErr) {
                console.error("[GetStatus] API Check Failed:", apiErr.message);
                // Continue to return pending status from DB
            }
        }

        // Return current DB status (PENDING)
        res.json({
            invoice_number,
            status: data.invoice_status.toUpperCase(),
            amount: data.total
        });

    } catch (error) {
        console.error("Get Status Error:", error);
        res.status(500).json({ message: "Internal Error" });
    }
};

/**
 * Handle Disbursement Webhook
 */
const handleDisbursementWebhook = async (req, res) => {
    try {
        const signatureValid = PrismaLinkService.validateSignature(req.headers, req.body);
        if (!signatureValid) {
            console.warn(`[DisburseWebhook] Invalid Signature. IP: ${req.ip}`);
            return res.status(401).json({ message: "Invalid Signature" });
        }

        const data = req.body;
        const { merchant_ref_no, transaction_status, response_code } = data;
        


        // Parse ID from WD-123
        const parts = merchant_ref_no.split('-');
        const txId = parts[1]; // Assuming WD-{ID}

        if (!txId) {
            return res.status(400).json({ message: "Invalid Reference Format" }); 
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Get Transaction with Lock
            const txRes = await client.query(
                `SELECT * FROM withdraw_transactions WHERE id = $1 FOR UPDATE`, 
                [txId]
            );

            if (txRes.rows.length === 0) {
                 await client.query('ROLLBACK');
                 return res.status(404).json({ message: "Transaction Not Found" });
            }

            const tx = txRes.rows[0];

            // 2. Idempotency Check
            if (tx.status !== 'processing') {
                console.log(`[DisburseWebhook] Ignored. Status is ${tx.status} (Not processing)`);
                await client.query('COMMIT');
                return res.json({ status: "OK", message: "Ignored" });
            }

            const NotificationService = require('../services/NotificationService');
            const WalletService = require('../services/WalletService');

            // 3. Determine Status
            let isSuccess = (response_code === '00' || transaction_status === 'Success' || transaction_status === 'Settlement');
            if (response_code === '05' || transaction_status === 'Failed') isSuccess = false;

            if (isSuccess) {
                // SUCCESS
                await WalletService.finalizeWithdrawal(tx.user_id, parseFloat(tx.amount), client);
                
                await client.query(
                    `UPDATE withdraw_transactions 
                     SET status = 'success', gateway_response = $1, updated_at = NOW() 
                     WHERE id = $2`,
                    [JSON.stringify(data), txId]
                );

                // Notify
                await NotificationService.createNotification(tx.user_id, 
                    "Penarikan Berhasil", 
                    `Dana Rp ${parseFloat(tx.amount).toLocaleString('id-ID')} berhasil dikirim.`, 
                    'success', txId, 'withdrawal');

            } else {
                // FAILED
                await WalletService.unlockBalance(tx.user_id, parseFloat(tx.amount), client);

                await client.query(
                    `UPDATE withdraw_transactions 
                     SET status = 'failed', gateway_response = $1, failure_reason = $2, updated_at = NOW() 
                     WHERE id = $3`,
                    [JSON.stringify(data), data.response_message || "Gateway Failed", txId]
                );

                // Notify
                await NotificationService.createNotification(tx.user_id, 
                    "Penarikan Gagal", 
                    `Penarikan gagal. Saldo dikembalikan ke wallet.`, 
                    'error', txId, 'withdrawal');
            }

            await client.query('COMMIT');
            res.json({ status: "OK" });

        } catch (err) {
            await client.query('ROLLBACK');
            throw err;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error("[DisburseWebhook] Error:", error);
        res.status(500).json({ message: "Internal Error" });
    }
};

module.exports = {
    handleWebhook,
    createTransaction,
    getStatus,
    handleDisbursementWebhook
};
