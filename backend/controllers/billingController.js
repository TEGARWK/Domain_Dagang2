const db = require("../config/db");
const OrderService = require("../services/OrderService");
const EmailService = require("../services/EmailService");
const NotificationService = require("../services/NotificationService");
const VoucherService = require("../services/VoucherService");
const WalletService = require("../services/WalletService");
const TransferController = require("./transferController");

// 1. Get All Invoices (By User ID - SECURE)
exports.getInvoices = (req, res) => {
  const userId = req.user.id; 

  const query = `
    SELECT i.*, 
    (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item,
    (SELECT action_type FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as action_type,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.invoice_id = i.id) > 0 as is_transfer,
    (SELECT COUNT(*) FROM payments p WHERE p.invoice_number = i.id AND p.payment_proof IS NOT NULL) > 0 as has_proof,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i 
    WHERE i.user_id = $1 
    ORDER BY i.created_at DESC
  `;
  
  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching invoices:", err);
      return res.status(500).json({ error: "Terjadi gangguan pada sistem. Silakan coba beberapa saat lagi." });
    }

    const invoices = results.map(inv => {
        let category = 'REGISTER';
        const at = (inv.action_type || '').toUpperCase();
        const firstItem = (inv.first_item || '').toLowerCase();
        
        if (at === 'TOPUP' || firstItem.includes('top up')) category = 'TOPUP';
        else if (at === 'TRANSFER' || inv.is_transfer) category = 'TRANSFER';
        else if (at === 'RENEW') category = 'RENEW';
        else if (at === 'RESTORE') category = 'RESTORE';
        return { ...inv, category };
    });

    res.json(invoices);
  });
};

// 2. Get Single Invoice Detail (With Items - SECURE)
// 2. Get Single Invoice Detail (With Items - SECURE)
// 2. Get Single Invoice Detail (With Items - SECURE)
// 2. Get Single Invoice Detail (With Items - SECURE)
exports.getInvoiceById = async (req, res) => {
  const invoiceId = req.params.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  try {
    // 1. Fetch Invoice + User + Payment Data
    let invoiceQuery = `
      SELECT i.*, 
             u.name as customer_name, u.email as customer_email, u.phone as customer_phone,
             p.transaction_id as plink_ref_no, p.payment_method as payment_channel, p.status as payment_status_detail, p.raw_response,
             p.va_number, p.expired_at, p.payment_proof
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN (
        SELECT DISTINCT ON (invoice_number) *
        FROM payments
        ORDER BY invoice_number, id DESC
      ) p ON i.id = p.invoice_number
      WHERE i.id = $1
    `;
    const params = [invoiceId];

    if (userRole !== 'admin') {
        invoiceQuery += " AND i.user_id = $2";
        params.push(userId);
    }

    const invoiceRes = await db.query(invoiceQuery, params);
    if (invoiceRes.length === 0) {
        return res.status(404).json({ error: "Tagihan tidak ditemukan atau Anda tidak memiliki akses." });
    }

    const invoice = invoiceRes[0];

    // 2. Fetch Invoice Items
    const itemsRes = await db.query(`SELECT * FROM invoice_items WHERE invoice_id = $1`, [invoiceId]);
    const items = itemsRes;

    // 3. Fetch Activity Logs
    const logsQuery = `SELECT action, description, created_at, user_type FROM activity_logs WHERE invoice_id = $1 ORDER BY created_at DESC`;
    const logsRes = await db.query(logsQuery, [invoiceId]);
    const formattedLogs = logsRes.map(log => ({
        action: log.action,
        description: log.description,
        date: new Date(log.created_at).toLocaleString('id-ID'),
        by: log.user_type
    }));

    // 4. Fetch Domain Statuses (if applicable)
    const domainNames = items.map(i => i.name.toLowerCase());
    const domainMap = {};

    if (domainNames.length > 0) {
        const domainQuery = `SELECT domain_name, status FROM domains WHERE domain_name = ANY($1)`;
        const domainsRes = await db.query(domainQuery, [domainNames]);
        domainsRes.forEach(d => {
            domainMap[d.domain_name] = d.status;
        });
    }

    const itemsWithStatus = items.map(item => ({
        ...item,
        domain_status: domainMap[item.name.toLowerCase()] || (invoice.status === 'paid' ? 'processing' : null)
    }));

    // 5. Finalize and Send Response
    sendResponse(invoice, itemsWithStatus, formattedLogs, res);

  } catch (err) {
    console.error("[billingController] getInvoiceById Error:", err);
    res.status(500).json({ error: err.message });
  }
};

// Helper response sender
function sendResponse(invoice, items, logs, res) {
    const now = new Date();
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const isExpired = (invoice.status === 'pending' || invoice.status === 'waiting') && 
                      dueDate && (dueDate < now);
    
    // Inisialisasi variabel di awal untuk mencegah ReferenceError
    let raw = null;
    let realPlinkRef = invoice.plink_ref_no || null;
    let qrString = null;
    let qrImage = null;

    if (invoice.raw_response) {
        try {
            raw = typeof invoice.raw_response === 'string' ? JSON.parse(invoice.raw_response) : invoice.raw_response;
            // Jika ada data QR dari raw_response, ambil di sini
            if (raw) {
                qrString = raw.qr_string || raw.payment_url || null;
                qrImage = raw.qr_image || null;
            }
        } catch (e) {
            console.error("Failed to parse raw_response", e);
        }
    }

    const isTopUp = items.some(it => it.action_type === 'topup' || it.name?.toLowerCase().includes('top up'));
    const isTransfer = items.some(it => it.action_type === 'transfer');
    const isRenew = items.some(it => it.action_type === 'renew');
    const isRestore = items.some(it => it.action_type === 'restore');

    let category = 'REGISTER';
    if (isTopUp) category = 'TOPUP';
    else if (isTransfer) category = 'TRANSFER';
    else if (isRenew) category = 'RENEW';
    else if (isRestore) category = 'RESTORE';

    const fullInvoice = {
        id: invoice.id,
        status: isExpired ? 'expired' : invoice.status,
        category: category,
        has_proof: !!invoice.payment_proof,
        refund_reason: invoice.refund_reason || null,
        date: new Date(invoice.date || invoice.created_at || now).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        due_date: invoice.due_date || null,
        due_date_formatted: dueDate ? dueDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : "Batas waktu tidak ditentukan",
        total: invoice.total,
        is_topup: isTopUp,
        subtotal: parseFloat(invoice.subtotal || (parseFloat(invoice.total) - parseFloat(invoice.tax_amount || 0))), 
        tax: parseFloat(invoice.tax_amount || 0),
        service_fee: 0, 
        discount: parseFloat(invoice.total_discount || 0),
        discount_meta: typeof invoice.discount_meta === 'string' ? JSON.parse(invoice.discount_meta) : (invoice.discount_meta || {}),
        payment_method: invoice.payment_channel || invoice.payment_method, 
        plink_ref_no: realPlinkRef,
        payment_instructions: {
            va_number: invoice.va_number,
            expired_at: invoice.expired_at,
            qr_string: qrString,
            qr_image: qrImage,
            bank_code: (String(invoice.payment_channel || "")).replace("VA_", ""),
            amount: invoice.total,
            total_fee: parseFloat(invoice.service_fee || (raw?.fee_customer ?? raw?.total_fee ?? 0)),
            provider: 'manual',
            manual_details: raw?.provider === 'manual' ? {
                bank_name: raw.bank_name,
                account_number: raw.account_number,
                account_holder: raw.account_holder,
                instructions: raw.instructions,
                qris_url: raw.qris_url,
                logo_url: raw.logo_url
            } : null,
            payment_proof: invoice.payment_proof || null
        },
        customer: {
          name: invoice.customer_name,
          email: invoice.customer_email,
          phone: invoice.customer_phone,
          address: invoice.customer_address || "Alamat belum diatur", 
        },
        items: items,
        logs: logs || []
    };

    if (raw) {
        if (raw.plink_ref_no) {
            fullInvoice.plink_ref_no = raw.plink_ref_no;
            fullInvoice.payment_instructions.plink_ref_no = raw.plink_ref_no;
            fullInvoice.payment_instructions.provider = 'prismalink';
        }
        // Prismalink Expiry

        if (raw.validity) {
            fullInvoice.payment_instructions.expired_at = raw.validity;
        }
        const qStr = raw.qris_data || raw.qr_string || raw.qr_code || raw.payment_url;
        if (qStr) {
            fullInvoice.payment_instructions.qr_string = qStr;
        }
        if (raw.qr_image) {
            fullInvoice.payment_instructions.qr_image = raw.qr_image;
        }
        
        // Final Service Fee Mapping
        fullInvoice.service_fee = parseFloat(raw.total_fee || raw.fee_customer || 0);
    }

    // Final Grand Total Calculation
    fullInvoice.grand_total = fullInvoice.subtotal + fullInvoice.tax + fullInvoice.service_fee - fullInvoice.discount;

    res.json(fullInvoice);
}


// 2b. Get Single Invoice Detail (ADMIN - Reuses logic but bypasses simple check if needed, 
// strictly speaking getInvoiceById above handles admin logic via role check. 
// We can deprecate this or just map it to the same logic if we want consistency.)
exports.getInvoiceByIdAdmin = (req, res) => {
    // Check role just in case middleware didn't (though authMiddleware should)
    if (req.user.role !== 'admin') return res.status(403).json("Access Denied");
    // Reuse the main function
    exports.getInvoiceById(req, res);
};

// 3. Process Payment and Activate Domains (Manual Admin Approval)
exports.payInvoice = async (req, res) => {
  const invoiceId = req.params.id;
  const { payment_method } = req.body; 

  const client = await db.pool.connect();
  try {
      await client.query('BEGIN');

      // 1. Fetch Invoice & Items to identify type
      const invRes = await client.query("SELECT * FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
      if (invRes.rows.length === 0) throw new Error("Invoice tidak ditemukan");
      const invoice = invRes.rows[0];

      if (invoice.status === 'paid') {
          return res.json({ message: "Invoice sudah dibayar sebelumnya", status: "paid" });
      }

      const itemsRes = await client.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
      const items = itemsRes.rows;

      // 2. Update Invoice Status
      await client.query("UPDATE invoices SET status = 'paid', payment_method = $1, paid_at = NOW() WHERE id = $2", [payment_method, invoiceId]);

      // Finalize Voucher
      await VoucherService.finalizeVoucherUsage(invoiceId, client);

      // Update payments status for manual
      await client.query("UPDATE payments SET status = 'SUCCESS' WHERE invoice_number = $1 AND status = 'PENDING'", [invoiceId]);

      // 3. COMMIT IMMEDIATELY to release locks and respond to admin faster
      await client.query('COMMIT');

      // --- ASYNC BACKGROUND PROCESSING ---
      // We process activation and emails outside the main transaction to prevent registrar API lag
      (async () => {
          try {
              const itemsRes = await db.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
              const items = itemsRes;
              const isTopUp = items.some(it => it.action_type === 'topup' || it.name?.toLowerCase().includes('top up')) || invoiceId.startsWith('TOPUP-');

              if (isTopUp) {
                  await WalletService.credit(invoice.user_id, invoice.total, 'TOPUP', invoiceId, 'Top Up via Manual Admin Approval');
                  const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [invoice.user_id]);
                  EmailService.sendTopupSuccess(userRes[0], invoice, invoice.total).catch(e => console.error(e));
              } else {
                  // DOMAIN PATH
                  console.log(`[payInvoice] Background Domain activation for: ${invoiceId}`);
                  const activationResult = await OrderService.activateDomain(invoiceId);

                  const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [invoice.user_id]);
                  const userObj = userRes[0];
                  const domainNames = items.map(i => i.name).join(', ');

                  if (activationResult.success || activationResult.status === 'provisioned') {
                      const isManual = (invoice.payment_method || "").startsWith("MANUAL_") || (invoice.payment_method || "").includes("MANUAL");
                      if (isManual) {
                          EmailService.sendManualPaymentSuccess(userObj, invoice).catch(e => console.error(e));
                      } else {
                          EmailService.sendPaymentSuccess(userObj, invoice, domainNames).catch(e => console.error(e));
                      }

                      NotificationService.createNotification(
                          invoice.user_id, 
                          "Pembayaran Dikonfirmasi", 
                          `Pembayaran manual untuk Invoice #${invoiceId} telah diverifikasi oleh admin.`, 
                          "success", 
                          invoiceId, 
                          "invoice"
                      );
                  }
              }

              // Referral Reward
              const referralService = require('../services/referralService');
              await referralService.processReferralReward(invoiceId).catch(e => console.error("[Referral] Reward Error:", e));

          } catch (bgErr) {
              console.error("[payInvoice] Background Processing Error:", bgErr);
          }
      })();

      // Respond immediately to admin
      res.json({ 
          message: "Pembayaran berhasil dikonfirmasi. Proses aktivasi sedang berjalan di latar belakang.", 
          status: "paid" 
      });
  } catch (err) {
      // Avoid rollback if client is already released or transaction is committed
      try {
          if (client && client._connected) await client.query('ROLLBACK');
      } catch (rbErr) {}
      
      console.error("[payInvoice] Error:", err);
      if (!res.headersSent) {
          res.status(500).json({ error: err.message || "Gagal memperbarui status invoice" });
      }
  } finally {
      if (client) client.release();
  }
};

// 3b. Reject Payment (Admin Manual Rejection)
exports.rejectInvoice = async (req, res) => {
  const invoiceId = req.params.id;
  const { reason } = req.body;

  if (!reason) return res.status(400).json({ error: "Alasan penolakan wajib diisi" });

  const client = await db.pool.connect();
  try {
      await client.query('BEGIN');

      // 1. Fetch Invoice
      const invRes = await client.query("SELECT * FROM invoices WHERE id = $1 FOR UPDATE", [invoiceId]);
      if (invRes.rows.length === 0) throw new Error("Invoice tidak ditemukan");
      const invoice = invRes.rows[0];

      if (invoice.status === 'paid') {
          throw new Error("Invoice sudah dibayar, tidak bisa ditolak");
      }

      // 2. Update Status -> failed
      await client.query("UPDATE invoices SET status = 'failed', refund_reason = $1, updated_at = NOW() WHERE id = $2", [reason, invoiceId]);
      
      // Update payments status
      await client.query("UPDATE payments SET status = 'FAILED' WHERE invoice_number = $1 AND (status = 'PENDING' OR (status = 'SUCCESS' AND payment_proof IS NOT NULL))", [invoiceId]);

      // 3. Notify User
      const userRes = await client.query('SELECT name, email FROM users WHERE id = $1', [invoice.user_id]);
      const userObj = userRes.rows[0];

      // Send Email
      const isManual = !!invoice.payment_method && (invoice.payment_method.startsWith('MANUAL_') || invoice.payment_method.includes('MANUAL'));
      if (isManual) {
          EmailService.sendManualPaymentRejected(userObj, invoice, reason).catch(e => console.error("[Billing] Reject Email Error:", e));
      } else {
          EmailService.sendPaymentFailed(userObj, invoice, reason).catch(e => console.error("[Billing] Reject Email Error:", e));
      }

      // Send Dashboard Notification
      NotificationService.createNotification(
          invoice.user_id, 
          "Pembayaran Ditolak", 
          `Pembayaran Invoice #${invoiceId} ditolak oleh admin. Alasan: ${reason}`, 
          "error", 
          invoiceId, 
          "invoice"
      );

      await client.query('COMMIT');
      res.json({ success: true, message: "Pembayaran berhasil ditolak." });

  } catch (err) {
      await client.query('ROLLBACK');
      console.error("[rejectInvoice] Error:", err);
      res.status(500).json({ error: err.message || "Gagal menolak invoice" });
  } finally {
      client.release();
  }
};

// 4. Get All Invoices (Admin Only)
exports.getAllInvoices = async (req, res) => {
  // Query Lengkap (Standard)
  const fullQuery = `
    SELECT i.*, u.name as customer_name, u.email as customer_email,
    (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item,
    (SELECT action_type FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as action_type,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.invoice_id = i.id) > 0 as is_transfer,
    (SELECT COUNT(*) FROM payments p WHERE p.invoice_number = i.id AND p.payment_proof IS NOT NULL) > 0 as has_proof,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i
    JOIN users u ON i.user_id = u.id
    ORDER BY i.created_at DESC
  `;

  // Query Cadangan (Jika tabel transfer_requests/payments belum ada)
  const lightQuery = `
    SELECT i.*, u.name as customer_name, u.email as customer_email,
    (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item,
    (SELECT action_type FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as action_type,
    FALSE as is_transfer,
    FALSE as has_proof,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i
    JOIN users u ON i.user_id = u.id
    ORDER BY i.created_at DESC
  `;

  try {
      let results;
      try {
          results = await db.query(fullQuery);
      } catch (sqlErr) {
          console.warn("[getAllInvoices] Full query failed, using Light Query fallback.");
          results = await db.query(lightQuery);
      }

      const invoices = results.map(inv => {
          let category = 'REGISTER';
          const at = (inv.action_type || '').toUpperCase();
          const firstItem = (inv.first_item || '').toLowerCase();
          
          if (at === 'TOPUP' || firstItem.includes('top up')) category = 'TOPUP';
          else if (at === 'TRANSFER' || inv.is_transfer) category = 'TRANSFER';
          else if (at === 'RENEW') category = 'RENEW';
          else if (at === 'RESTORE') category = 'RESTORE';
          return { ...inv, category };
      });
      res.json(invoices);
  } catch (err) {
      console.error("[getAllInvoices] Critical Error:", err);
      res.status(500).json({ error: "Gagal mengambil data invoice" });
  }
};
// 5. Delete Invoice (Admin Only)
exports.deleteInvoice = async (req, res) => {
  const invoiceId = req.params.id;
  const client = await db.pool.connect();

  try {
      await client.query('BEGIN');

      const deleteItems = "DELETE FROM invoice_items WHERE invoice_id = $1";
      const deletePayments = "DELETE FROM payments WHERE invoice_number = $1"; // Cleanup linked payments
      const deleteInvoice = "DELETE FROM invoices WHERE id = $1";

      await client.query(deleteItems, [invoiceId]);
      await client.query(deletePayments, [invoiceId]);
      const result = await client.query(deleteInvoice, [invoiceId]);

      if (result.rowCount === 0) {
          throw new Error("Invoice tidak ditemukan");
      }

      await client.query('COMMIT');
      res.json({ message: "Invoice deleted successfully" });
  } catch (err) {
      await client.query('ROLLBACK');
      console.error("[deleteInvoice] Error:", err);
      res.status(500).json({ error: "Failed to delete invoice: " + err.message });
  } finally {
      client.release();
  }
};

// 6. Get User Invoices (Admin Only)
exports.getUserInvoicesAdmin = async (req, res) => {
  const userId = req.params.userId;
  
  const fullQuery = `
    SELECT i.*, 
    (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item,
    (SELECT action_type FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as action_type,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.invoice_id = i.id) > 0 as is_transfer,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i 
    WHERE i.user_id = $1 
    ORDER BY i.created_at DESC
  `;

  const lightQuery = `
    SELECT i.*, 
    (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item,
    (SELECT action_type FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as action_type,
    FALSE as is_transfer,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i 
    WHERE i.user_id = $1 
    ORDER BY i.created_at DESC
  `;
  
  try {
      let results;
      try {
          results = await db.query(fullQuery, [userId]);
      } catch (sqlErr) {
          console.warn("[getUserInvoicesAdmin] Full query failed, using Light Query fallback.");
          results = await db.query(lightQuery, [userId]);
      }

      const invoices = results.map(inv => {
          let category = 'REGISTER';
          const at = (inv.action_type || '').toUpperCase();
          const firstItem = (inv.first_item || '').toLowerCase();
          
          if (at === 'TOPUP' || firstItem.includes('top up')) category = 'TOPUP';
          else if (at === 'TRANSFER' || inv.is_transfer) category = 'TRANSFER';
          else if (at === 'RENEW') category = 'RENEW';
          else if (at === 'RESTORE') category = 'RESTORE';
          return { ...inv, category };
      });
      res.json(invoices);
  } catch (err) {
      console.error("[getUserInvoicesAdmin] Critical Error:", err);
      res.status(500).json({ error: "Gagal mengambil data invoice user" });
  }
};

// 7. Pay Invoice with Wallet
exports.payInvoiceWithWallet = async (req, res) => {
    const invoiceId = req.params.id;
    const userId = req.user.id; // Corrected from req.user (which is object) to req.user.id based on middleware



    const client = await db.pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Get Invoice & Verify Ownership (LOCK FOR UPDATE)
        const invoiceRes = await client.query(
            `SELECT * FROM invoices WHERE id = $1 AND user_id = $2 FOR UPDATE`, 
            [invoiceId, userId]
        );
        
        if (invoiceRes.rows.length === 0) {
            throw new Error("Invoice not found or unauthorized");
        }

        const invoice = invoiceRes.rows[0];

        if (invoice.status === 'paid' || invoice.status === 'PAID') {
             throw new Error("Invoice already paid");
        }
        
        const amount = parseFloat(invoice.total);

        // 2. Fetch Coupon ID if applicable
        let couponId = null;
        if (invoice.coupon_code) {
           const couponRes = await client.query("SELECT id FROM vouchers WHERE code = $1", [invoice.coupon_code]);
           if (couponRes.rows.length > 0) couponId = couponRes.rows[0].id;
        }

        // 3. (REMOVED: Coupon Reservation - System reset)

        // 4. Check Wallet Balance & Debit (Transactional)

        await WalletService.debit(userId, amount, 'PAYMENT', invoiceId, `Payment for Invoice #${invoiceId}`, client);

        // 5. Update Invoice Status
        await client.query(
            `UPDATE invoices SET status = 'paid', payment_method = 'WALLET', updated_at = NOW() WHERE id = $1`, 
            [invoiceId]
        );

        // Finalize Voucher
        await VoucherService.finalizeVoucherUsage(invoiceId, client);

        // CRITICAL: COMMIT TRANSACTION BEFORE API CALL (V-02 FIX)
        // This secures the funds. If the next steps fail, we have the money to refund.
        await client.query('COMMIT');

        // 6. Trigger Domain Activation / Service Provisioning

        
        // Identify service type from invoice items
        const itemRes = await client.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
        const items = itemRes.rows;
        const actionType = items[0]?.action_type || 'register';
        
        const isTransfer = items.some(it => it.action_type === 'transfer' || (it.name || '').toLowerCase().includes('transfer'));
        const isTopUp = items.some(it => it.action_type === 'topup' || (it.name || '').toLowerCase().includes('top up')) || invoiceId.startsWith('TOPUP-');

        let activationResult = { success: true };

        if (isTopUp) {

            await WalletService.credit(userId, amount, 'TOPUP', invoiceId, 'Top Up via Wallet (Internal)');
            
            // Send Email Notification
            try {
                const userRes = await client.query('SELECT name, email FROM users WHERE id = $1', [userId]);
                EmailService.sendTopupSuccess(userRes.rows[0], invoice, amount).catch(e => console.error(e));
            } catch (e) { console.error("[Billing] Topup Email Error:", e); }

        } else if (isTransfer) {

            // TransferController.processTransfer is async but handles its own internal logging/notif
            TransferController.processTransfer(invoiceId);
        } else {
            // Normal registration or renewal
            activationResult = await OrderService.activateDomain(invoiceId);
        }
        
        // --- V-02: AUTO-REFUND LOOPHOLE FIX ---
        if (!activationResult.success && activationResult.errorType === 'DOMAIN_TAKEN') {
            console.warn(`[Billing] CRITICAL: Domain taken by others. Initiating Auto-Refund for Invoice ${invoiceId}`);
            
            // Perform Refund to Wallet
            await WalletService.credit(
                userId, 
                amount, 
                'REFUND', 
                invoiceId, 
                `Auto-Refund: Domain taken by others (Inv #${invoiceId})`
            );

            // Mark invoice as REFUNDED
            await db.pool.query(
                `UPDATE invoices SET status = 'REFUNDED', updated_at = NOW(), refund_reason = $1 WHERE id = $2`,
                ['Domain taken during checkout process'], [invoiceId]
            );

            return res.status(400).json({
                success: false,
                error: "Maaf, domain baru saja diambil oleh orang lain. Saldo Anda telah dikembalikan ke Wallet.",
                status: 'REFUNDED'
            });
        }
        // ----------------------------------------
        
        // --- NOTIFICATIONS (Async) ---
        try {
            // Fetch additional data for email
            const userRes = await db.pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
            const userObj = userRes.rows[0];
            
            const itemsRes = await db.pool.query('SELECT name FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
            const domainNames = itemsRes.rows.map(i => i.name).join(', ');

            // Send Email
            EmailService.sendPaymentSuccess(userObj, invoice, domainNames);

            // Send Dashboard Notification
            NotificationService.createNotification(
                userId, 
                "Pembayaran Berhasil", 
                `Pembayaran Invoice #${invoiceId} sebesar Rp${parseFloat(invoice.total).toLocaleString('id-ID')} berhasil.`, 
                "success", 
                invoiceId, 
                "invoice"
            );
        } catch (notifErr) {
            console.error("[Billing] Notification Failed:", notifErr);
        }
        // -----------------------------

        let message = "Payment Successful";
        if (!activationResult.success) {
            console.warn(`[Billing] Activation Warning: ${activationResult.message}`);
            message += ". Warning: " + activationResult.message;
        }

        return res.json({ 
            success: true, 
            message: message,
            status: 'paid',
            activation: activationResult
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[Billing] Pay Wallet Error:`, err);

        // --- FAILURE NOTIFICATION (Async) ---
        try {
             // Only notify for logic errors, not system crashes, to avoid spamming on recurring bugs
             if (err.message === "Insufficient Balance") {
                const userRes = await db.pool.query('SELECT name, email FROM users WHERE id = $1', [userId]);
                const userObj = userRes.rows[0];
                
                // Get invoice details if available (might be null if error happened before fetch)
                const invRes = await db.pool.query('SELECT * FROM invoices WHERE id = $1', [invoiceId]);
                const invObj = invRes.rows[0] || { id: invoiceId, total: 0 };

                EmailService.sendPaymentFailed(userObj, invObj, err.message);
                
                NotificationService.createNotification(
                    userId, 
                    "Pembayaran Gagal", 
                    `Pembayaran Invoice #${invoiceId} gagal: ${err.message}`, 
                    "error", 
                    invoiceId, 
                    "invoice"
                );
             }
        } catch (notifErr) {
            console.error("[Billing] Failure Notification Error:", notifErr);
        }
        // ------------------------------------

        // Return 400 for known logic errors
        if (err.message === "Insufficient Balance" || 
            err.message === "Wallet not found" ||
            err.message === "Invoice already paid" ||
            err.message === "Invoice not found or unauthorized") {
            return res.status(400).json({ success: false, error: err.message });
        }

        return res.status(500).json({ success: false, error: err.message || "Payment Failed" });
    } finally {
        client.release();
    }
};

// 8. Cancel Invoice (User Action)
exports.cancelInvoice = async (req, res) => {
    const invoiceId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    const query = "UPDATE invoices SET status = 'cancelled', refund_reason = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 AND status ILIKE ANY(ARRAY['pending', 'waiting'])";
    
    try {
        const result = await db.query(query, [reason, invoiceId, userId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Tagihan tidak ditemukan, sudah dibayar, atau status tidak mengizinkan pembatalan." });
        }

        res.json({ success: true, message: "Invoice cancelled successfully", status: "cancelled" });
    } catch (err) {
        console.error("[cancelInvoice] Error:", err);
        res.status(500).json({ error: "Failed to cancel invoice" });
    }
};

// 9. Recalculate Invoice (Apply/Remove Voucher to existing Invoice)
exports.recalculateInvoice = async (req, res) => {
    const invoiceId = req.params.id;
    const userId = req.user.id;
    const { voucherCode } = req.body; // Can be null to remove

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Fetch Invoice & Verify
        const invRes = await client.query(
            "SELECT * FROM invoices WHERE id = $1 AND user_id = $2 AND status = 'pending'",
            [invoiceId, userId]
        );
        if (invRes.rows.length === 0) throw new Error("Invoice tidak ditemukan atau sudah dibayar.");
        const invoice = invRes.rows[0];

        // 2. Fetch Items
        const itemsRes = await client.query("SELECT * FROM invoice_items WHERE invoice_id = $1", [invoiceId]);
        const items = itemsRes.rows;

        // 3. Calculate New Pricing
        let subtotal = 0;
        items.forEach(it => {
            subtotal += parseFloat(it.price || 0);
        });

        let totalDiscount = 0;
        let appliedVoucher = null;

        if (voucherCode) {
            // Validate Voucher
            // Map items format for VoucherService
            const cartItemsForVoucher = items.map(it => {
                const name = it.name.toLowerCase();
                const tldMatch = name.match(/\.[a-z]{2,}(\.[a-z]{2})?$/);
                return {
                    name: it.name,
                    action: it.action_type || 'register',
                    base_price: parseFloat(it.unit_price || it.price),
                    duration: parseInt(it.years || 1),
                    tld: tldMatch ? tldMatch[0] : ""
                };
            });

            const voucherResult = await VoucherService.validateVoucherForCart(userId, voucherCode, cartItemsForVoucher, invoiceId);
            if (!voucherResult.eligible) {
                throw new Error(voucherResult.message || "Voucher tidak valid.");
            }
            totalDiscount = voucherResult.discountAmount;
            appliedVoucher = voucherResult.voucher;

            // LINK CLAIM TO INVOICE (Locked)
            // First clear any previous links for this invoice to handle switching vouchers
            await client.query("UPDATE voucher_claims SET invoice_id = NULL WHERE invoice_id = $1 AND status = 'claimed'", [invoiceId]);
            // Then link the new one
            await client.query("UPDATE voucher_claims SET invoice_id = $1 WHERE id = $2", [invoiceId, voucherResult.claimId]);
        } else {
            // REMOVE VOUCHER CASE: Unlink any claimed voucher from this invoice
            await client.query("UPDATE voucher_claims SET invoice_id = NULL WHERE invoice_id = $1 AND status = 'claimed'", [invoiceId]);
        }

        const netAmount = Math.max(0, subtotal - totalDiscount);
        
        // PPN check (logic from checkoutController)
        const hasDomain = items.some(it => 
            it.name.includes('.') || 
            (it.description || "").toLowerCase().includes('reg') ||
            (it.action_type || "").toLowerCase().includes('register')
        );
        
        const PPN_PERCENT = 0.11;
        const taxAmount = hasDomain ? Math.floor(netAmount * PPN_PERCENT) : 0;
        const finalAmount = netAmount + taxAmount;

        // 4. Update Database
        await client.query(`
            UPDATE invoices 
            SET subtotal = $1, 
                total_discount = $2, 
                net_amount = $3, 
                tax_amount = $4, 
                total = $5,
                coupon_code = $6,
                updated_at = NOW()
            WHERE id = $7
        `, [subtotal, totalDiscount, netAmount, taxAmount, finalAmount, voucherCode || null, invoiceId]);

        await client.query('COMMIT');

        // Reuse the response formatter
        const updatedInvRes = await client.query("SELECT i.*, u.name as customer_name, u.email as customer_email FROM invoices i JOIN users u ON i.user_id = u.id WHERE i.id = $1", [invoiceId]);
        sendResponse(updatedInvRes.rows[0], items, [], res);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[RecalculateInvoice] Error:", err);
        res.status(400).json({ error: err.message });
    } finally {
        client.release();
    }
};

// 10. Initialize Manual Payment
exports.initializeManualPayment = async (req, res) => {
    const { invoice_number, payment_channel } = req.body;
    const userId = req.user.id;

    if (!invoice_number || !payment_channel) {
        return res.status(400).json({ success: false, message: "Invoice number dan payment channel wajib diisi" });
    }

    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Validate Invoice
        const invRes = await client.query('SELECT * FROM invoices WHERE id = $1 AND user_id = $2', [invoice_number, userId]);
        const invoice = invRes.rows[0];

        if (!invoice) throw new Error("Invoice tidak ditemukan");
        if (invoice.status === 'paid') throw new Error("Invoice sudah dibayar");

        // 2. Validate Manual Gateway
        const manualId = String(payment_channel).replace('manual_', '');
        const gatewayRes = await client.query("SELECT * FROM payment_gateways WHERE id = $1 AND provider = 'manual' AND is_active = true", [manualId]);
        const gateway = gatewayRes.rows[0];

        if (!gateway) throw new Error("Metode pembayaran manual tidak tersedia");

        const merchantRef = `MAN-${invoice_number}-${Date.now()}`;
        const transactionAmount = parseFloat(invoice.total);
        const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

        // 3. Create/Update Payment Record
        await client.query(`
            INSERT INTO payments (
                invoice_number, 
                transaction_id, 
                amount, 
                payment_method, 
                status, 
                raw_response, 
                transaction_type,
                expired_at
            )
            VALUES ($1, $2, $3, $4, 'PENDING', $5, $6, $7)
            ON CONFLICT (transaction_id) DO UPDATE SET
                payment_method = EXCLUDED.payment_method,
                amount = EXCLUDED.amount,
                raw_response = EXCLUDED.raw_response,
                expired_at = EXCLUDED.expired_at,
                updated_at = NOW()
        `, [
            invoice_number, 
            merchantRef, 
            transactionAmount, 
            `MANUAL_${gateway.bank_name.toUpperCase()}`, 
            JSON.stringify({ ...gateway, provider: 'manual' }),
            invoice_number.startsWith('TOPUP-') ? 'TOPUP' : 'DOMAIN',
            expiredAt
        ]);

        await client.query('COMMIT');

        res.json({ 
            success: true, 
            message: "Pembayaran manual berhasil diinisialisasi",
            data: {
                ...gateway,
                merchant_ref: merchantRef,
                amount: transactionAmount,
                expired_at: expiredAt,
                provider: 'manual'
            }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("[initializeManualPayment] Error:", err);
        res.status(500).json({ success: false, message: err.message });
    } finally {
        client.release();
    }
};

// 11. Confirm Manual Payment (Upload Proof)
exports.confirmManualPayment = async (req, res) => {
    const { id } = req.params; // Invoice ID
    const { payment_proof } = req.body;
    const userId = req.user.id;

    if (!payment_proof) {
        return res.status(400).json({ success: false, message: "Bukti pembayaran wajib diupload" });
    }

    try {
        // 1. Validate Invoice & Ownership
        const invRes = await db.query('SELECT status FROM invoices WHERE id = $1 AND user_id = $2', [id, userId]);
        if (invRes.length === 0) {
            return res.status(404).json({ success: false, message: "Invoice tidak ditemukan" });
        }

        if (invRes[0].status === 'paid') {
            return res.status(400).json({ success: false, message: "Invoice sudah lunas" });
        }

        // 2. Update Payment Record
        const updateQuery = `
            UPDATE payments 
            SET payment_proof = $1, proof_uploaded_at = NOW(), status = 'PENDING'
            WHERE invoice_number = $2
        `;
        const result = await db.query(updateQuery, [payment_proof, id]);

        if (result.rowCount === 0) {
            // If no payment record exists, maybe it was never initialized
            return res.status(400).json({ success: false, message: "Inisialisasi pembayaran tidak ditemukan. Silakan pilih metode pembayaran lagi." });
        }

        // 3. Log Activity
        await db.query(`
            INSERT INTO activity_logs (invoice_id, action, description, user_type)
            VALUES ($1, $2, $3, $4)
        `, [id, 'CONFIRM_PAYMENT', 'User mengupload bukti pembayaran manual', 'user']);

        // 4. Send Email Notification to User (Async)
        try {
            const userRes = await db.query('SELECT name, email FROM users WHERE id = $1', [userId]);
            if (userRes.length > 0) {
                const userObj = userRes[0];
                const invData = { id: id, total: invRes[0].total || 0 }; // Minimal info needed for template
                // We need the total, let's fetch it if missing
                if (!invData.total) {
                    const fullInv = await db.query('SELECT total FROM invoices WHERE id = $1', [id]);
                    invData.total = fullInv[0]?.total || 0;
                }
                EmailService.sendManualPaymentWaiting(userObj, invData).catch(e => console.error("[Billing] Waiting Email Error:", e));
            }
        } catch (emailErr) {
            console.error("[Billing] Manual Confirmation Email Trigger Error:", emailErr);
        }

        res.json({ 
            success: true, 
            message: "Bukti pembayaran berhasil diupload. Mohon tunggu verifikasi admin." 
        });

    } catch (err) {
        console.error("[confirmManualPayment] Error:", err);
        res.status(500).json({ success: false, message: "Gagal mengupload bukti pembayaran" });
    }
};
