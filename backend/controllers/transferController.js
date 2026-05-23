const db = require("../config/db");
const InvoiceService = require("../services/InvoiceService");
const DaftarnamaService = require("../services/DaftarnamaService");
const { createLog } = require("./auditController");

/**
 * Helper: Format phone number for Registrar (e.g., +62.812345678)
 * Daftarnama expects: +[country_code].[number]
 */
const formatPhoneForRegistrar = (phone) => {
    if (!phone) return "+62.8123456789";
    let cleaned = phone.replace(/\D/g, ''); 
    if (cleaned.startsWith('0')) {
        cleaned = '62' + cleaned.substring(1);
    }
    if (!cleaned.startsWith('62')) {
        cleaned = '62' + cleaned;
    }
    return `+62.${cleaned.substring(2)}`; 
};

// Helper: Get Pricing for Domain
const getDomainPricing = async (domain) => {
    // Find TLD (longest match first, e.g. .co.id before .id)
    // For simplicity, we split by dot and try combinations or use a database LIKE query
    // Better approach: Get all TLDs and match in JS or use SQL suffix match
    
    // Simple suffix extraction:
    // .com, .co.id, .my.id, etc.
    // Try to match from the database
    const query = "SELECT * FROM pricing ORDER BY LENGTH(tld) DESC"; 
    const { rows } = await db.pool.query(query);
    
    const pricing = rows.find(p => domain.endsWith(p.tld));
    return pricing || null;
};

// 0. Check Transfer Eligibility & Price (Called by Frontend Step 1)
exports.checkTransfer = async (req, res) => {
    const { domain_name } = req.body;
    if (!domain_name) return res.status(400).json({ message: "Domain name is required" });

    try {
        // A. Check Eligibility
        const eligibility = await DaftarnamaService.checkTransferEligibility(domain_name);
        if (!eligibility.eligible) {
             return res.json({ eligible: false, reason: eligibility.reason });
        }

        // B. Get Pricing
        const pricing = await getDomainPricing(domain_name);
        if (!pricing) {
            return res.json({ eligible: false, reason: "TLD tidak didukung atau harga belum diatur." });
        }

        // Return Data
        res.json({
            eligible: true,
            price: parseFloat(pricing.price_transfer),
            period: 1 // Transfer always adds 1 year
        });

    } catch (err) {
        console.error("[Check Transfer Error]:", err);
        res.status(500).json({ message: "Gagal memeriksa domain." });
    }
};

// 1. Submit Transfer Request (User) -> Create Invoice
exports.submitTransfer = async (req, res) => {
    const { domain_name, epp_code, current_registrar, config } = req.body;
    const userId = req.user.id; // From JWT

    if (!domain_name || !epp_code) {
        return res.status(400).json("Domain name and EPP code are required.");
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // A. Check Eligibility
        const eligibility = await DaftarnamaService.checkTransferEligibility(domain_name);
        if (!eligibility.eligible) {
            return res.status(400).json({ 
                message: "Domain tidak memenuhi syarat transfer.", 
                reason: eligibility.reason 
            });
        }

        // B. Create Invoice with Dynamic Pricing
        const pricing = await getDomainPricing(domain_name);
        
        // Fallback or Error if no pricing found
        if (!pricing) {
             throw new Error("Harga untuk ekstensi domain ini belum diatur. Hubungi admin.");
        }

        const transferPrice = parseFloat(pricing.price_transfer);
        const transferCost = parseFloat(pricing.cost_transfer);

        const calculationResults = {
            subtotal: transferPrice,
            totalDiscount: 0,
            netAmount: transferPrice,
            taxAmount: 0, // Assuming tax handled elsewhere or 0 for now
            finalAmount: transferPrice,
            totalCost: transferCost,
            profitAmount: transferPrice - transferCost,
            profitMarginPercent: transferPrice > 0 ? ((transferPrice - transferCost) / transferPrice) * 100 : 0,
            taxSubsidyAmount: 0
        };

        const invoiceResult = await InvoiceService.create(
            userId,
            [{ name: domain_name, duration: 1, action: 'transfer', unit_price: transferPrice, total_line_price: transferPrice, cost_price: transferCost }], 
            null, // promoCode
            client,
            calculationResults, // Pass this for correct totals!
            config || {}
        );

        if (!invoiceResult.success) {
            throw new Error("Gagal membuat invoice.");
        }

        // C. Save Transfer Request (Status: PENDING_PAYMENT)
        const sql = `
            INSERT INTO transfer_requests (user_id, domain_name, epp_code, current_registrar, status, invoice_id)
            VALUES ($1, $2, $3, $4, 'PENDING_PAYMENT', $5)
            RETURNING id
        `;
        const values = [userId, domain_name, epp_code, current_registrar || "", invoiceResult.invoiceId];
        const result = await client.query(sql, values);

        // Audit Log
        await createLog({
            user_id: userId,
            action: 'SUBMIT_TRANSFER',
            entity_type: 'domain_transfer',
            entity_id: result.rows[0].id,
            new_value: { domain: domain_name },
            req
        });

        await client.query('COMMIT');

        res.status(201).json({ 
            message: "Permintaan transfer dibuat. Silakan selesaikan pembayaran.", 
            transferId: result.rows[0].id,
            invoiceId: invoiceResult.invoiceId 
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[Transfer Submit Error]:", err);
        res.status(500).json({ message: err.message || "Terjadi kesalahan server." });
    } finally {
        client.release();
    }
};

// 2. Get My Transfer Requests (User)
exports.getMyTransfers = (req, res) => {
    const userId = req.user.id;
    const sql = "SELECT * FROM transfer_requests WHERE user_id = $1 ORDER BY created_at DESC";

    db.query(sql, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
};

// 3. Get All Transfer Requests (Admin)
exports.getAllTransfers = (req, res) => {
    const sql = `
        SELECT t.*, u.name as user_name, u.email as user_email
        FROM transfer_requests t
        JOIN users u ON t.user_id = u.id
        ORDER BY t.created_at DESC
    `;
    db.query(sql, (err, results) => {
        if (err) {
            console.error("[TransferController] DB Error:", err);
            return res.status(500).json(err);
        }
        
        const data = results && results.length > 0 ? results : [];
        console.log(`[TransferController] getAllTransfers returning ${data.length} rows`);
        
        // Let's add a dummy if it's STILL empty, to prove it's connected
        /*
        if (data.length === 0) {
            data.push({
                id: 999,
                domain_name: 'test-connection.com',
                user_name: 'System Debug',
                user_email: 'debug@system.com',
                epp_code: 'DEBUG',
                status: 'PENDING_REVIEW',
                created_at: new Date().toISOString()
            });
        }
        */
        
        res.json(data);
    });
};

// 4. Update Transfer Status (Admin Manual Override)
exports.updateTransferStatus = async (req, res) => {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const validStatuses = ['PENDING_REVIEW', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'PENDING_PAYMENT', 'IN_PROGRESS', 'FAILED'];
    if (status && !validStatuses.includes(status)) {
        return res.status(400).json("Invalid status.");
    }

    try {
        let fields = [];
        let values = [];
        let counter = 1;

        if (status) {
            fields.push(`status = $${counter++}`);
            values.push(status);
        }
        if (admin_notes !== undefined) {
            fields.push(`admin_notes = $${counter++}`);
            values.push(admin_notes);
        }

        if (fields.length > 0) {
            fields.push(`updated_at = NOW()`);
            values.push(id);
            const updateSql = `UPDATE transfer_requests SET ${fields.join(", ")} WHERE id = $${counter}`;
            await db.pool.query(updateSql, values);
        }

        res.json({ success: true, message: "Transfer request updated successfully." });

        if (status) {
            // NOTIFICATION: Admin Manual Status Update
            const NotificationService = require('../services/NotificationService');
            // Fetch user_id for this transfer request first to be safe
            const reqData = await db.pool.query("SELECT user_id, domain_name FROM transfer_requests WHERE id = $1", [id]);
            if (reqData.rows.length > 0) {
                const { user_id, domain_name } = reqData.rows[0];
                await NotificationService.createNotification(user_id, 
                    "Update Status Transfer", 
                    `Status transfer domain ${domain_name} telah diperbarui menjadi ${status}.`, 
                    status === 'REJECTED' || status === 'FAILED' ? 'error' : 'info', 
                    domain_name, 'domain_transfer');
            }
        }
    } catch (err) {
        console.error("[Transfer Update Error]:", err);
        res.status(500).json(err.message);
    }
};

// 5. Internal: Process Transfer (Called by Payment Webhook)
exports.processTransfer = async (invoiceId) => {
    console.log(`[Transfer] Processing auto-transfer for invoice: ${invoiceId}`);
    
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        // 1. Get Transfer Request with User Details
        const getSql = `
            SELECT t.*, u.name, u.email, u.phone, u.city, u.state as province, u.zip_code as postal_code, u.address_line1 as address_1,
                   i.checkout_config
            FROM transfer_requests t
            JOIN users u ON t.user_id = u.id
            JOIN invoices i ON t.invoice_id = i.id
            WHERE t.invoice_id = $1 AND t.status = 'PENDING_PAYMENT'
        `;
        console.log(`[Transfer] Fetching transfer request for invoice: ${invoiceId}...`);
        const resRequest = await client.query(getSql, [invoiceId]);
        console.log(`[Transfer] Query result count: ${resRequest.rows.length}`);

        if (resRequest.rows.length === 0) {
            console.log(`[Transfer] No pending transfer found for invoice ${invoiceId}`);
            await client.query('ROLLBACK');
            return;
        }

        const transfer = resRequest.rows[0];

        // 2. Update Status -> PROCESSING
        console.log(`[Transfer] Updating status to PROCESSING for transfer ID: ${transfer.id}`);
        await client.query("UPDATE transfer_requests SET status = 'PROCESSING' WHERE id = $1", [transfer.id]);
        
        // 3. Initiate Transfer at Registrar
        try {
            console.log(`[Transfer] Calling Registrar API for ${transfer.domain_name}...`);
            // Check if we already have a verified handle for this user
            const freshUserRes = await client.query("SELECT registrar_customer_id FROM users WHERE id = $1", [transfer.user_id]);
            const existingHandle = freshUserRes.rows[0]?.registrar_customer_id;
            
            let username;
            let withExisting = false;

            if (existingHandle) {
                username = existingHandle;
                withExisting = true;
            } else {
                username = transfer.email.split('@')[0] + Math.floor(1000 + Math.random() * 9000);
                withExisting = false;
            }

            const contactData = {
                username: username, 
                password: "DomainUser123!", // Default or generated
                name: transfer.name,
                company_name: "Individual", // Default
                email: transfer.email,
                address_1: transfer.address_1 || "Jl. Digital No. 1",
                address_2: "-",
                address_3: "-",
                city: transfer.city || "Jakarta",
                province: transfer.province || "DKI Jakarta",
                country: "ID",
                postal_code: transfer.postal_code || "12345",
                phone_number: formatPhoneForRegistrar(transfer.phone),
                mobile_phone_number: formatPhoneForRegistrar(transfer.phone),
                with_existing_customer: withExisting
            };

            const registrarRes = await DaftarnamaService.initiateTransfer(transfer.domain_name, transfer.epp_code, contactData);
            
            // 4. Update Success -> IN_PROGRESS
            await client.query(
                "UPDATE transfer_requests SET status = 'IN_PROGRESS', registrar_transfer_id = $1, updated_at = NOW() WHERE id = $2",
                [registrarRes.id || 'MANUAL_ID', transfer.id]
            );
            console.log(`[Transfer] Successfully initiated transfer for ${transfer.domain_name}`);

            // 4b. Upsert into 'domains' table so it appears in "My Domains" dashboard
            // We set status to 'provisioned' or 'pending' because transfer is not yet complete
            const upsertDomainSql = `
                INSERT INTO domains (
                    user_id, domain_name, status, registrar_name, 
                    registrar_order_id, registrar_response_raw, 
                    auto_renew, whois_privacy, registrant_snapshot,
                    created_at, updated_at
                )
                VALUES ($1, $2, $3, 'Daftarnama', $4, $5, $6, $7, $8, NOW(), NOW())
                ON CONFLICT (domain_name) 
                DO UPDATE SET 
                    user_id = EXCLUDED.user_id,
                    status = EXCLUDED.status,
                    registrar_order_id = EXCLUDED.registrar_order_id,
                    registrar_response_raw = EXCLUDED.registrar_response_raw,
                    auto_renew = EXCLUDED.auto_renew,
                    whois_privacy = EXCLUDED.whois_privacy,
                    registrant_snapshot = EXCLUDED.registrant_snapshot,
                    updated_at = NOW()
            `;
            await client.query(upsertDomainSql, [
                transfer.user_id, 
                transfer.domain_name, 
                'provisioned', // Use provisioned for in-progress transfers
                registrarRes.id || 'MANUAL_ID',
                JSON.stringify(registrarRes),
                !!transfer.checkout_config?.autoRenew,
                !!transfer.checkout_config?.whoisPrivacy,
                null // Missing: registrant_snapshot
            ]);

            // NOTIFICATION: Transfer Initiated Successfully
            const NotificationService = require('../services/NotificationService');
            await NotificationService.createNotification(transfer.user_id, 
                "Proses Transfer Berjalan", 
                `Transfer domain ${transfer.domain_name} telah berhasil diajukan ke registrar dan sedang dalam proses.`, 
                'success', transfer.domain_name, 'domain_transfer');

            await client.query('COMMIT');

        } catch (registrarErr) {
            await client.query('ROLLBACK');
            console.error(`[Transfer] Failed at registrar for ${transfer.domain_name}:`, registrarErr.message);
            
            // Log failure outside the transaction using db.query or a new client
            await db.query(
                "UPDATE transfer_requests SET status = 'FAILED_AT_REGISTRAR', failure_reason = $1, updated_at = NOW() WHERE id = $2",
                [registrarErr.message, transfer.id]
            );

            // NOTIFICATION: Transfer Failed at Registrar
            const NotificationService = require('../services/NotificationService');
            await NotificationService.createNotification(transfer.user_id, 
                "Gagalan Transfer Domain", 
                `Gagal mengajukan transfer untuk ${transfer.domain_name}: ${registrarErr.message}. Tim kami akan memeriksa secara manual.`, 
                'error', transfer.domain_name, 'domain_transfer');
        }

    } catch (err) {
        console.error("[Transfer Process Error]:", err);
    } finally {
        client.release();
    }
};

