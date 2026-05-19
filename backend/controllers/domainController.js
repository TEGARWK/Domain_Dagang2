const db = require("../config/db");
const axios = require("axios");
const DaftarnamaService = require("../services/DaftarnamaService");
const DomainLoggingService = require("../services/DomainLoggingService");

// Simple in-memory rate limiter for EPP (per process)
const eppRateLimits = new Map(); 

// --- HELPER: Validate Hostname (FQDN) ---
const isValidHostname = (hostname) => {
    if (!hostname || typeof hostname !== "string") return false;
    // 1. No http:// or https://
    if (hostname.includes("://")) return false;
    // 2. Not an IP address (basic check)
    if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname)) return false;
    // 3. Valid FQDN regex
    const fqdnRegex = /^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/;
    return fqdnRegex.test(hostname);
};

const mapDocumentStatus = (regData) => {
    const rawStatus = (regData.document_status || "").toLowerCase();

    // Default to rejected (Action Required) if raw status is missing
    if (!rawStatus) return "rejected";

    // 1. Success cases (Exact match to avoid NOT_COMPLETE matching COMPLETE)
    const approvedKeywords = ["complete", "completed", "approved", "active", "lengkap", "no_document_needed", "disetujui"];
    if (approvedKeywords.includes(rawStatus)) {
        return "approved";
    }

    // 2. Rejected / Action Required cases
    const rejectKeywords = ["upload_required", "rejected", "ditolak", "belum_upload", "verification", "required", "not_complete", "not_approved"];
    if (rejectKeywords.some(kw => rawStatus.includes(kw))) {
        return "rejected";
    }

    // 3. Pending cases
    const pendingKeywords = ["waiting_verification", "pending", "menunggu", "proses", "verifying"];
    if (pendingKeywords.some(kw => rawStatus.includes(kw))) {
        return "pending";
    }

    return "rejected";
};

// --- CHECK DOMAIN AVAILABILITY ---
exports.checkDomainAvailability = async (req, res) => {
  const { domain } = req.query;
  try {
    if (!domain) {
      return res.status(400).json({
        success: false,
        message: "Parameter domain wajib diisi",
      });
    }

    const response = await DaftarnamaService.checkAvailability(domain);

    return res.json({
      success: true,
      domain,
      available: response?.data?.available ?? false,
      message: response?.message || "Success",
      raw: response,
    });
  } catch (error) {
    const errorData = error.response?.data;
    const errorMessage = errorData?.message || error.message || "Gagal menghubungi API Registrar";

    console.error("[DomainController] Check Availability Error:", {
        message: errorMessage,
        domain,
        data: errorData,
        status: error.response?.status
    });

    // Specific handling for Unauthorized IP
    if (typeof errorMessage === 'string' && errorMessage.includes("IP address has not been listed")) {
        const publicIp = await DaftarnamaService.getPublicIP();
        return res.status(403).json({ 
            success: false,
            message: `IP Server (${publicIp}) Belum Terdaftar di Whitelist Daftarnama. Silakan update di Dashboard Daftarnama.`,
            error: "IP_UNAUTHORIZED",
            ip: publicIp
        });
    }

    // Specific handling for Unsupported TLD (Sandbox constraint)
    if (errorMessage.includes("This TLD is not supported")) {
        return res.json({
            success: true,
            domain,
            available: false,
            message: "Domain tidak didukung di environment ini (Sandbox)",
            error: "TLD_NOT_SUPPORTED"
        });
    }

    const fs = require('fs');
    const path = require('path');
    const debugLog = path.join(__dirname, '../error_debug.log');
    const logEntry = `[${new Date().toISOString()}] ❌ CHECK DOMAIN ERROR (${domain}): ${errorMessage}\nSTACK: ${error.stack}\nDATA: ${JSON.stringify(errorData)}\n\n`;
    fs.appendFileSync(debugLog, logEntry);

    return res.status(500).json({
      success: false,
      message: "Gagal cek ketersediaan domain",
      error: errorMessage,
    });
  }
};

// --- GET DOMAINS BY USER ID ---
exports.getUserDomains = (req, res) => {
  const userId = req.params.userId;
  console.log(`[DomainController] Fetching domains for User ID: ${userId}`);
  const sql = `
    SELECT d.id, d.user_id, d.domain_name AS name, d.status, d.auto_renew, d.is_locked, 
    d.nameservers, d.registration_date, d.expiration_date, d.last_registration_error, d.created_at, d.updated_at,
    d.registrar_response_raw,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.domain_name = d.domain_name AND tr.user_id = d.user_id AND tr.status IN ('COMPLETED', 'SUCCESS', 'IN_PROGRESS', 'PENDING_TRANSFER')) > 0 AS is_transfer
    FROM domains d 
    WHERE d.user_id = ?
    ORDER BY d.id DESC
  `;

  db.query(sql, [userId], (err, data) => {
    if (err) return res.status(500).json(err);
    
    // Map document status for each domain
    const results = data.map(dom => {
        const regData = dom.registrar_response_raw ? (typeof dom.registrar_response_raw === 'string' ? JSON.parse(dom.registrar_response_raw) : dom.registrar_response_raw) : {};
        return {
            ...dom,
            document_status_mapped: mapDocumentStatus(regData.data || regData)
        };
    });

    return res.status(200).json(results);
  });
};

// --- GET DOMAIN DETAIL (Untuk Manage Domain) ---
exports.getDomainDetail = (req, res) => {
  try {
    const domainId = parseInt(req.params.id);
    const userId = req.user.id; 



    let sql = `
        SELECT 
            d.id, d.user_id, d.domain_name AS name, d.status, d.document_status, 
            d.auto_renew, d.is_locked, d.nameservers, d.registration_date, d.expiration_date, 
            d.registrar_name, d.registrar_order_id, d.registrar_domain_id,
            d.registrar_response_raw, d.last_registration_error, d.last_document_sync_at, d.last_document_upload_attempt_at, 
            d.registrant_snapshot,
            d.created_at, d.updated_at,
            u.name AS user_name, u.email as user_email, u.phone as user_phone,
            inv.id as invoice_id, inv.status as invoice_status, inv.total as invoice_total,
            ii.price as purchase_price
        FROM domains d
        JOIN users u ON d.user_id = u.id
        LEFT JOIN LATERAL (
            SELECT i.id, i.status, i.total, i.created_at
            FROM invoice_items ii_inner
            JOIN invoices i ON ii_inner.invoice_id = i.id
            WHERE ii_inner.name = d.domain_name AND i.user_id = d.user_id
            ORDER BY i.created_at DESC
            LIMIT 1
        ) inv ON true
        LEFT JOIN invoice_items ii ON ii.invoice_id = inv.id AND ii.name = d.domain_name
        WHERE d.id = ?
    `;
    const params = [domainId];

    if (req.user.role !== 'admin') {
        sql += " AND d.user_id = ?";
        params.push(userId);
    }

    db.query(sql, params, (err, data) => {
      if (err) {
          console.error("[DEBUG] SQL Error in getDomainDetail:", err);
          return res.status(500).json({ error: "Gagal memuat rincian domain." });
      }
      if (data.length === 0) return res.status(404).json("Domain not found or unauthorized");

      try {
          const domain = data[0];

          
          // Always re-map from raw registrar data to ensure accuracy and freshness
          const regData = domain.registrar_response_raw ? (typeof domain.registrar_response_raw === 'string' ? JSON.parse(domain.registrar_response_raw) : domain.registrar_response_raw) : {};
          domain.document_status_mapped = mapDocumentStatus(regData.data || regData);

          return res.status(200).json(domain);
      } catch (innerErr) {
          console.error("[DEBUG] JS Error in getDomainDetail callback:", innerErr);
          return res.status(500).json({ error: "Gagal memproses data domain." });
      }
    });
  } catch (outerErr) {
    console.error("[DEBUG] JS Error in getDomainDetail:", outerErr);
    return res.status(500).json({ error: "Terjadi gangguan pada sistem. Silakan coba lagi." });
  }
};

// --- UPDATE DOMAIN SETTINGS ---
exports.updateDomain = async (req, res) => {
  const domainId = req.params.id;
  const userId = req.user.id; 
  const { auto_renew, is_locked, nameservers } = req.body;

  try {
      const [rows] = await db.promise().query("SELECT domain_name, user_id, status, nameservers FROM domains WHERE id = ?", [domainId]);
      if (rows.length === 0) return res.status(404).json("Domain not found");
      
      const domain = rows[0];
      if (req.user.role !== 'admin' && domain.user_id !== userId) {
          return res.status(403).json("Unauthorized");
      }

      let fields = [];
      let values = [];

      if (nameservers !== undefined) {
          try {
              const currentStatus = (domain.status || "").toLowerCase();
              if (currentStatus !== 'active' && currentStatus !== 'provisioned') {
                  return res.status(400).json({ 
                      success: false, 
                      message: `Update Nameserver hanya diizinkan untuk domain berstatus ACTIVE atau PROVISIONED. Status saat ini: ${currentStatus.toUpperCase()}`
                  });
              }

              const validNS = Array.isArray(nameservers) ? nameservers.filter(ns => ns.trim() !== "") : [];
              if (validNS.length < 2) {
                  return res.status(400).json({ success: false, message: "Minimal 2 Nameserver wajib diisi." });
              }

              const invalidNS = validNS.filter(ns => !isValidHostname(ns));
              if (invalidNS.length > 0) {
                  return res.status(400).json({ success: false, message: `Format Nameserver tidak valid: ${invalidNS.join(", ")}` });
              }

              await DaftarnamaService.updateNameservers(domain.domain_name, validNS);
              
              let oldNS = [];
              try {
                  oldNS = typeof domain.nameservers === 'string' ? JSON.parse(domain.nameservers) : (Array.isArray(domain.nameservers) ? domain.nameservers : []);
              } catch (e) {
                  console.warn("[updateDomain] Failed to parse oldNS");
              }
              await DomainLoggingService.log(domainId, domain.status, domain.status, "User updated nameservers", null, domain.domain_name, {
                  event_type: "NAMESERVER_UPDATED",
                  old_value: oldNS,
                  new_value: validNS,
                  performed_by: userId
              });

              fields.push("nameservers = ?");
              values.push(JSON.stringify(validNS));

              setImmediate(async () => {
                  try {
                    const info = await DaftarnamaService.getDomainInfo(domain.domain_name);
                    if (info && info.data) {
                        await db.promise().query("UPDATE domains SET status = ?, expiration_date = ?, last_document_sync_at = NOW() WHERE id = ?", [info.data.status.toLowerCase(), info.data.expiry_date, domainId]);
                    }
                  } catch (e) {
                    console.error("[updateDomain] Post-update sync failed:", e.message);
                  }
              });
          } catch (nsErr) {
              console.error("[updateDomain] Error updating NS:", nsErr.message);
              throw nsErr;
          }
      }

      if (is_locked !== undefined) {
          try {
              await DaftarnamaService.setRegistrarLock(domain.domain_name, is_locked);
              fields.push("is_locked = ?");
              values.push(is_locked ? true : false);
          } catch (lockErr) {
              console.error("[updateDomain] Error updating Lock:", lockErr.message);
              throw lockErr;
          }
      }

      if (auto_renew !== undefined) {
          // --- 🛡️ BACKEND VALIDASI SALDO UNTUK AUTO RENEW ---
          if (auto_renew === true && req.user.role !== 'admin') {
              const WalletService = require('../services/WalletService');
              const balance = await WalletService.getBalance(userId);
              if (balance <= 0) {
                  return res.status(400).json({ 
                      success: false, 
                      message: "Saldo Anda Kosong. Silakan isi saldo terlebih dahulu untuk mengaktifkan perpanjangan otomatis." 
                  });
              }
          }
          fields.push("auto_renew = ?");
          values.push(auto_renew);
      }

      if (fields.length > 0) {
          values.push(domainId);
          const sql = `UPDATE domains SET ${fields.join(", ")}, updated_at = NOW() WHERE id = ?`;
          await db.promise().query(sql, values);
          return res.status(200).json({ success: true, message: "Domain updated successfully" });
      } else {
          return res.status(200).json({ success: true, message: "No changes detected" });
      }

  } catch (err) {
      console.error("[updateDomain] Error:", err.message);
      
      // Handle registrar Not Found (404)
      if (err.response?.status === 404 || err.message?.includes("404")) {
          return res.status(404).json({
              success: false,
              message: "Domain tidak ditemukan di sistem Registrar (Daftarnama). Pastikan domain sudah terdaftar."
          });
      }

      return res.status(500).json({
          success: false,
          message: "Gagal memperbarui data domain. Silakan coba lagi beberapa saat lagi."
      });
  }
};

// --- SYNC DOMAIN (Admin/User) ---
exports.syncDomain = async (req, res) => {
    const domainId = req.params.id;
    try {
         // 1. Get domain name
        const [rows] = await db.promise().query("SELECT domain_name FROM domains WHERE id = ?", [domainId]);
        if (rows.length === 0) return res.status(404).json("Domain not found");
        const domainName = rows[0].domain_name;

        // 2. Fetch from Registrar
        const info = await DaftarnamaService.getDomainInfo(domainName);
        if (!info) {
            return res.json({ 
                success: false, 
                message: "Domain belum terdaftar atau tidak ditemukan di sistem Registrar (Daftarnama). Silakan tunggu atau hubungi dukungan jika pembayaran sudah sukses.",
                is_not_registered: true
            });
        }



        // registrar might return document_status in info.data or info
        const regData = info.data || info;
        const mappedDocStatus = mapDocumentStatus(regData);


        
        // Inject back for consistency
        if (info.data) info.data.document_status_mapped = mappedDocStatus;
        else info.document_status_mapped = mappedDocStatus;

        // 3. Update Local DB
        // Map API response fields to DB fields. 
        const registrarStatus = (info.status || '').toLowerCase();
        let internalStatus = registrarStatus || 'active'; // Default to active if status is missing and it's not a transfer
        
        // --- NEW: Check if there's an ongoing transfer for this domain ---
        const [transferReq] = await db.promise().query(
            "SELECT status FROM transfer_requests WHERE TRIM(domain_name) = TRIM(?) AND status NOT IN ('COMPLETED', 'SUCCESS', 'REJECTED', 'FAILED')", 
            [domainName.trim()]
        );
        
        if (transferReq && transferReq.length > 0) {
            console.log(`[Sync] Domain ${domainName} found in active transfer_requests. Forcing pending_transfer status.`);
            // If there's an active transfer request, force status to pending_transfer
            internalStatus = 'pending_transfer';
        } else if (registrarStatus.includes('document') || registrarStatus.includes('transfer') || registrarStatus === 'provisioned' || registrarStatus === 'pending') {
            internalStatus = 'provisioned';
        }

        // -------------------------------------

        const expiry = info.expires_at || info.expiry_date;
        const expiryDate = expiry ? new Date(expiry) : null;
        const ns = info.nameservers ? JSON.stringify(info.nameservers) : null;
        const locked = info.transfer_protection !== undefined ? info.transfer_protection : info.is_locked;
        
        // Extract Registrar IDs with more robust mapping
        const orderId = regData.order_id || info.order_id || regData.registration_id || null;
        const regDomainId = regData.domain_id || info.domain_id || regData.id || info.id || null;

        let sql = "UPDATE domains SET status = ?, document_status = ?, registrar_response_raw = ?, last_document_sync_at = NOW(), updated_at = NOW()";
        let params = [internalStatus, mappedDocStatus, JSON.stringify(info)];

        if (orderId) {
            sql += ", registrar_order_id = ?";
            params.push(orderId);
        }
        if (regDomainId) {
            sql += ", registrar_domain_id = ?";
            params.push(regDomainId);
        }
        if (expiryDate && !isNaN(expiryDate.getTime())) {
            sql += ", expiration_date = ?";
            params.push(expiryDate);
        }
        if (ns) {
            sql += ", nameservers = ?";
            params.push(ns);
        }
        if (typeof locked === 'boolean') {
             sql += ", is_locked = ?";
             params.push(locked);
        }

        sql += " WHERE id = ?";
        params.push(domainId);

        await db.promise().query(sql, params);

        // Fetch latest data to return
        const [updatedRows] = await db.promise().query("SELECT registrar_response_raw FROM domains WHERE id = ?", [domainId]);

        res.json({ 
            success: true, 
            message: `Domain synced. Status: ${internalStatus}`, 
            data: info,
            registrar_response_raw: updatedRows[0]?.registrar_response_raw 
        });

    } catch (err) {
        console.error("Sync Error:", err);
        res.status(500).json({ success: false, message: "Gagal melakukan sinkronisasi data domain." });
    }
};

// --- RENEW DOMAIN (Manual - Creates Invoice) ---
// --- RENEW DOMAIN (Direct Execution +1 Year) ---
exports.renewDomain = async (req, res) => {
    const domainId = req.params.id;
    const userId = req.user.id;

    try {
        // 1. Ownership & Current Data Validation
        const [rows] = await db.promise().query("SELECT * FROM domains WHERE id = ? AND user_id = ?", [domainId, userId]);
        if (rows.length === 0) return res.status(404).json("Domain not found or unauthorized.");
        const domain = rows[0];

        if (domain.status.toLowerCase() !== 'active') {
            return res.status(400).json("Hanya domain berstatus ACTIVE yang dapat diperpanjang.");
        }

        // 2. Call Registrar API FIRST (Strict API Order)

        
        // Daftarnama v2 requires current_expiry_date in YYYY-MM-DD format
        // Use local component extraction to avoid UTC shift by one day
        const d = new Date(domain.expiration_date);
        const currentExpiryStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        
        // DaftarnamaService expects domain_name, period (years), and currentExpiryDate
        const registrarResponse = await DaftarnamaService.renewDomain(domain.domain_name, 1, currentExpiryStr);

        // 3. SAFE Date Calculation (Adds exactly 1 year to current expiration_date)
        const currentExpiry = new Date(domain.expiration_date);
        const newExpiry = new Date(currentExpiry);
        newExpiry.setFullYear(currentExpiry.getFullYear() + 1);

        // 4. Update Database & Log (Only if API Success)
        const updateSql = "UPDATE domains SET expiration_date = ?, updated_at = NOW() WHERE id = ?";
        await db.promise().query(updateSql, [newExpiry, domainId]);

        // Audit Logging
        await DomainLoggingService.log(domainId, 'active', 'active', "Domain renewed successfully (+1 Year)", JSON.stringify(registrarResponse), domain.domain_name, {
            event_type: "RENEWAL_SUCCESS",
            old_value: { expiration_date: domain.expiration_date },
            new_value: { expiration_date: newExpiry },
            performed_by: userId
        });

        res.json({ 
            success: true, 
            message: "Domain berhasil diperpanjang selama 1 tahun!", 
            new_expiry_date: newExpiry.toISOString()
        });

    } catch (err) {
        console.error("[DomainController] Renewal Error:", err.response?.data || err.message);
        
        const errorMsg = err.response?.data?.message || err.message || "Gagal memperpanjang domain.";
        res.status(err.response?.status || 500).json({ 
            success: false, 
            message: "Gagal memperpanjang domain. Silakan hubungi dukungan jika masalah berlanjut." 
        });
    }
};

// --- GET ALL DOMAINS (Admin Only) ---
exports.getAllDomains = (req, res) => {
  const sql = `
    SELECT d.*, u.name as user_name,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.domain_name = d.domain_name AND tr.user_id = d.user_id AND tr.status IN ('COMPLETED', 'SUCCESS', 'IN_PROGRESS', 'PENDING_TRANSFER')) > 0 AS is_transfer
    FROM domains d
    JOIN users u ON d.user_id = u.id
    ORDER BY d.created_at DESC
  `;
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json(err);
    
    // Standardize data for Admin Panel
    const formatted = data.map(domain => {
        const regData = domain.registrar_response_raw ? (typeof domain.registrar_response_raw === 'string' ? JSON.parse(domain.registrar_response_raw) : domain.registrar_response_raw) : {};
        domain.document_status_mapped = mapDocumentStatus(regData, domain.status);
        return domain;
    });

    return res.status(200).json(formatted);
  });
};

// --- GET DOMAIN AUDIT LOGS (Admin Only) ---
exports.getDomainAuditLogs = async (req, res) => {
    const domainId = req.params.id;
    const sql = "SELECT * FROM domain_event_logs WHERE domain_id = ? ORDER BY created_at DESC";
    
    db.query(sql, [domainId], (err, data) => {
        if (err) return res.status(500).json(err);
        return res.status(200).json(data);
    });
};

// --- RETRY REGISTRATION (Admin Only) ---
exports.retryRegistration = async (req, res) => {
    const domainId = req.params.id;
    try {
        const DomainSyncWorker = require("../workers/DomainSyncWorker");
        const [rows] = await db.promise().query("SELECT d.*, u.email, u.name as user_name FROM domains d JOIN users u ON d.user_id = u.id WHERE d.id = ?", [domainId]);
        if (rows.length === 0) return res.status(404).json("Domain not found");
        
        const domain = rows[0];
        // Trigger syncDomain logic which handles registration if status is failed/paid
        await DomainSyncWorker.syncDomain(domain);
        
        res.json({ success: true, message: "Retry pendaftaran berhasil dipicu." });
    } catch (err) {
        console.error("Manual Retry Error:", err);
        res.status(500).json({ success: false, message: "Gagal memicu proses pendaftaran ulang." });
    }
};

// --- UPDATE REGISTRAR LOCK (User Only) ---
exports.updateRegistrarLock = async (req, res) => {
    const domainId = req.params.id;
    const userId = req.user.id;
    const { is_locked } = req.body;

    if (is_locked === undefined) return res.status(400).json("is_locked field is required");

    try {
        // 1. Ownership & Status Validation
        const [rows] = await db.promise().query(
            "SELECT domain_name, status, is_locked FROM domains WHERE id = ? AND user_id = ?",
            [domainId, userId]
        );

        if (rows.length === 0) return res.status(404).json("Domain not found or unauthorized");
        const domain = rows[0];

        const currentStatus = (domain.status || "").toLowerCase();
        if (currentStatus !== 'active' && currentStatus !== 'provisioned') {
            return res.status(400).json("Registrar Lock can only be updated for ACTIVE or PROVISIONED domains.");
        }

        // 2. Idempotency Check
        if (!!domain.is_locked === !!is_locked) {
            return res.json({ success: true, message: "Lock status already up to date." });
        }

        // 3. Call Registrar

        await DaftarnamaService.setRegistrarLock(domain.domain_name, is_locked);

        // 4. Update local DB
        await db.promise().query("UPDATE domains SET is_locked = ?, updated_at = NOW() WHERE id = ?", [is_locked, domainId]);

        // 5. Audit Logging
        await DomainLoggingService.log(
            domainId, 
            domain.status, 
            domain.status, 
            is_locked ? "Transfer Lock Enabled" : "Transfer Lock Disabled",
            null,
            domain.domain_name,
            {
                event_type: is_locked ? "TRANSFER_LOCK_ENABLED" : "TRANSFER_LOCK_DISABLED",
                old_value: !!domain.is_locked,
                new_value: !!is_locked,
                performed_by: userId
            }
        );

        res.json({ success: true, message: `Registrar Lock ${is_locked ? 'activated' : 'deactivated'} successfully.` });
    } catch (err) {
        console.error("[DomainController] Lock update error:", err.message);
        res.status(500).json({ success: false, message: err.response?.data?.message || err.message });
    }
};

// --- GET EPP CODE (User Only - High Security) ---
exports.getEPPCode = async (req, res) => {
    const domainId = req.params.id;
    const userId = req.user.id;
    const rateLimitKey = `${userId}_${domainId}`;

    // 1. Rate Limiting (1 request per 60s)
    const lastReq = eppRateLimits.get(rateLimitKey);
    if (lastReq && (Date.now() - lastReq < 60000)) {
        const remaining = Math.ceil((60000 - (Date.now() - lastReq)) / 1000);
        console.warn(`[DomainController] Rate limit hit for EPP: User ${userId}, Domain ${domainId}, IP ${req.ip}. Remaining: ${remaining}s`);
        return res.status(429).json({ 
            success: false, 
            message: `Please wait ${remaining} seconds before requesting EPP code again.` 
        });
    }

    try {
        // 2. Ownership & Status Validation
        const [rows] = await db.promise().query(
            "SELECT domain_name, status FROM domains WHERE id = ? AND user_id = ?",
            [domainId, userId]
        );

        if (rows.length === 0) return res.status(404).json("Domain not found or unauthorized");
        const domain = rows[0];

        const currentStatus = (domain.status || "").toLowerCase();
        if (currentStatus !== 'active' && currentStatus !== 'provisioned') {
            return res.status(400).json("EPP Code retrieval only available for ACTIVE or PROVISIONED domains.");
        }

        // 3. Set Rate Limit
        eppRateLimits.set(rateLimitKey, Date.now());

        // 4. Fetch Live from Registrar (Non-persistent)

        const info = await DaftarnamaService.getDomainInfo(domain.domain_name);
        
        if (!info || !info.data || !info.data.epp_code) {
            throw new Error("EPP Code not available from registrar at this moment.");
        }

        // 5. Return (Never save to DB or Log)
        res.json({ 
            success: true, 
            epp_code: info.data.epp_code,
            warning: "Jangan bagikan kode ini kepada siapa pun. Kode ini bersifat rahasia."
        });

    } catch (err) {
        console.error("[DomainController] EPP retrieval error."); // Sanitize log (no domain name to be safe)
        res.status(500).json({ 
            success: false, 
            message: "Gagal mengambil kode EPP. Silakan coba lagi beberapa saat lagi." 
        });
    }
};

/**
 * GET /domains/:id/document-url
 * Retrieve direct upload URL from registrar for .ID domains
 */
exports.getUploadDocumentUrl = async (req, res) => {
    const domainId = req.params.id;
    const userId = req.user.id;

    try {
        // 1. Ownership Validation
        const [rows] = await db.promise().query(
            "SELECT domain_name FROM domains WHERE id = ? AND user_id = ?",
            [domainId, userId]
        );

        if (rows.length === 0) return res.status(404).json("Domain not found or unauthorized");
        const domain = rows[0];

        // 2. Update upload attempt timestamp & Log
        await db.promise().query("UPDATE domains SET last_document_upload_attempt_at = NOW() WHERE id = ?", [domainId]);
        await DomainLoggingService.logChange(domainId, "DOCUMENT_UPLOAD_REDIRECT_CLICKED", "User requested document upload URL", { performed_by: userId });

        // 3. Fetch from Registrar

        const result = await DaftarnamaService.getDocumentUrl(domain.domain_name);

        if (!result || !result.data || !result.data.upload_document_url) {
            return res.status(400).json({
                success: false,
                message: "Upload URL tidak tersedia dari registrar. Silakan cek status domain Anda."
            });
        }

        res.json({
            success: true,
            upload_url: result.data.upload_document_url,
            last_attempt_at: new Date().toISOString()
        });

    } catch (err) {
        console.error("[DomainController] Document URL error:", err.message);
        res.status(500).json({
            success: false,
            message: "Registrar API Error: " + (err.response?.data?.message || "Gagal mengambil URL upload.")
        });
    }
};

// --- ADMIN: UPDATE DOMAIN (Status Override, etc) ---
exports.adminUpdateDomain = async (req, res) => {
    const { id } = req.params;
    const { status, expiration_date, registration_date, registrar_name } = req.body;
    
    try {
        const sql = `
            UPDATE domains 
            SET status = COALESCE(?, status),
                expiration_date = COALESCE(?, expiration_date),
                registration_date = COALESCE(?, registration_date),
                registrar_name = COALESCE(?, registrar_name),
                updated_at = NOW()
            WHERE id = ?
            RETURNING *
        `;
        const [rows] = await db.promise().query(sql, [status, expiration_date, registration_date, registrar_name, id]);
        
        if (rows.length === 0) return res.status(404).json({ message: "Domain tidak ditemukan" });
        
        // Log Activity
        await DomainLoggingService.logChange(id, "ADMIN_OVERRIDE", `Admin updated domain fields. Status: ${status}`, { adminId: req.user.id });
        
        res.json(rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};

// --- ADMIN: DELETE DOMAIN ---
exports.deleteDomain = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.promise().query("SELECT domain_name FROM domains WHERE id = ?", [id]);
        if (rows.length === 0) return res.status(404).json({ message: "Domain tidak ditemukan" });
        
        const domainName = rows[0].domain_name;
        
        // Hard delete for management simplicity
        await db.promise().query("DELETE FROM domains WHERE id = ?", [id]);
        

        res.json({ message: `Domain ${domainName} berhasil dihapus dari sistem.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
};
// --- RESYNC USER DOMAINS (Recovery & Sync) ---
exports.resyncUserDomains = async (req, res) => {
    const userId = req.params.userId || req.user.id;
    const requesterId = req.user.id;
    const isAdmin = req.user.role === 'admin';

    // Allow user to sync only their own unless admin
    if (!isAdmin && parseInt(userId) !== parseInt(requesterId)) {
        return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    try {

        
        // 1. Fetch all local domains for this user
        const [localDomains] = await db.promise().query("SELECT id, domain_name FROM domains WHERE user_id = ?", [userId]);
        
        let updatedCount = 0;
        let recoveredCount = 0;
        let failedCount = 0;

        // --- STEP 1: Sync Existing Local Domains ---
        for (const local of localDomains) {
            try {
                const info = await DaftarnamaService.getDomainInfo(local.domain_name);
                if (info) {
                    // Update Local DB using existing sync logic (simplified here)
                    const regData = info.data || info;
                    const internalStatus = (reqData => {
                        const s = (reqData.status || 'active').toLowerCase();
                        return (s.includes('document') || s === 'provisioned' || s === 'pending') ? 'provisioned' : s;
                    })(regData);

                    const mappedDocStatus = mapDocumentStatus(regData);

                    const expiry = regData.expires_at || regData.expiry_date || null;
                    const expiryDate = expiry ? new Date(expiry) : null;
                    
                    await db.promise().query(
                        `UPDATE domains SET status = ?, document_status = ?, expiration_date = ?, 
                         registrar_order_id = ?, registrar_domain_id = ?, registrar_response_raw = ?, 
                         last_document_sync_at = NOW(), updated_at = NOW() 
                         WHERE id = ?`,
                        [
                            internalStatus, 
                            mappedDocStatus, 
                            (expiryDate && !isNaN(expiryDate.getTime())) ? expiryDate : null,
                            regData.order_id || null,
                            regData.domain_id || null,
                            JSON.stringify(info),
                            local.id
                        ]
                    );
                    updatedCount++;
                }
            } catch (syncErr) {
                console.warn(`[Resync] Failed to sync ${local.domain_name}:`, syncErr.message);
                failedCount++;
            }
        }

        // --- STEP 2: Recover Missing Domains from Paid Invoices ---
        const [paidItems] = await db.promise().query(`
            SELECT DISTINCT ii.name as domain_name
            FROM invoices i 
            JOIN invoice_items ii ON i.id = ii.invoice_id 
            WHERE i.user_id = ? AND i.status = 'PAID' AND ii.action_type IN ('register', 'transfer')
            AND ii.name NOT IN (SELECT domain_name FROM domains WHERE user_id = ?)
        `, [userId, userId]);

        for (const item of paidItems) {
            const domName = item.domain_name.toLowerCase();
            try {
                const info = await DaftarnamaService.getDomainInfo(domName);
                if (info) {
                    const regData = info.data || info;
                    const internalStatus = (reqData => {
                        const s = (reqData.status || 'active').toLowerCase();
                        return (s.includes('document') || s === 'provisioned' || s === 'pending') ? 'provisioned' : s;
                    })(regData);
                    
                    const mappedDocStatus = mapDocumentStatus(regData);
                    const expiry = regData.expires_at || regData.expiry_date || null;
                    const regDate = regData.registration_date || regData.created_at || null;

                    await db.promise().query(`
                        INSERT INTO domains (user_id, domain_name, status, registrar_name, registrar_order_id, registrar_domain_id, registration_date, expiration_date, registrar_response_raw, created_at, updated_at)
                        VALUES (?, ?, ?, 'Daftarnama', ?, ?, ?, ?, ?, NOW(), NOW())
                    `, [
                        userId, domName, internalStatus, 
                        regData.order_id || null, regData.domain_id || null,
                        regDate ? new Date(regDate) : null,
                        expiry ? new Date(expiry) : null,
                        JSON.stringify(info)
                    ]);
                    recoveredCount++;
                }
            } catch (recoverErr) {
                console.warn(`[Resync] Failed to recover ${domName}:`, recoverErr.message);
            }
        }

        res.json({
            success: true,
            message: `Resync selesai. ${updatedCount} diperbarui, ${recoveredCount} dipulihkan, ${failedCount} gagal sinkron.`,
            stats: { updated: updatedCount, recovered: recoveredCount, failed: failedCount }
        });

    } catch (err) {
        console.error("[DomainController] Global Resync Error:", err.message, err.stack);
        res.status(500).json({
            success: false,
            message: "Gagal melakukan resync domain: " + err.message
        });
    }
};

// --- SYNC MANUAL DOMAINS DARI REGISTRAR (ADMIN ONLY) ---
exports.syncManualRegistrarDomains = async (req, res) => {
    try {
        const { domains } = req.body;
        if (!domains || !Array.isArray(domains)) {
            return res.status(400).json({ success: false, message: "Parameter 'domains' harus berupa array string" });
        }

        const SyncService = require('../services/SyncService');
        const result = await SyncService.syncManualList(domains);
        
        return res.status(200).json({ success: true, ...result });
    } catch (err) {
        console.error("[DomainController] syncManualRegistrarDomains Error:", err.message);
        return res.status(500).json({ success: false, message: err.message });
    }
};
