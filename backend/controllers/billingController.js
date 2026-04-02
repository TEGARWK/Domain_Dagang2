const db = require("../config/db");
const OrderService = require("../services/OrderService");
const PromoEngine = require("../services/PromoEngine");
const EmailService = require("../services/EmailService");
const NotificationService = require("../services/NotificationService");
const TransferController = require("./transferController");

// 1. Get All Invoices (By User ID - SECURE)
exports.getInvoices = (req, res) => {
  const userId = req.user.id; 


  // Query using Postgres native syntax ($1) to avoid adapter issues
  const query = `
    SELECT i.*, 
    (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.invoice_id = i.id) > 0 as is_transfer,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i 
    WHERE i.user_id = $1 
    ORDER BY i.created_at DESC
  `;
  


  db.query(query, [userId], (err, results) => {
    if (err) {
      console.error("Error fetching invoices:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }

    res.json(results);
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
             p.va_number, p.expired_at
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      LEFT JOIN payments p ON i.id = p.invoice_number
      WHERE i.id = $1
    `;
    const params = [invoiceId];

    if (userRole !== 'admin') {
        invoiceQuery += " AND i.user_id = $2";
        params.push(userId);
    }

    const invoiceRes = await db.query(invoiceQuery, params);
    if (invoiceRes.length === 0) {
        return res.status(404).json({ error: "Invoice not found or unauthorized" });
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
    const isExpired = invoice.status === 'pending' && new Date(invoice.due_date) < new Date();
    
    // Parse raw_response if needed to get real plink_ref_no if different
    let realPlinkRef = invoice.plink_ref_no;
    let qrString = null;
    let qrImage = null;

    if (invoice.raw_response) {
        try {
            const raw = typeof invoice.raw_response === 'string' ? JSON.parse(invoice.raw_response) : invoice.raw_response;
            if (raw.plink_ref_no) realPlinkRef = raw.plink_ref_no;
            qrString = raw.qris_data || raw.qr_string || raw.qr_code || raw.payment_url;
            qrImage = raw.qr_image;
        } catch (e) {}
    }

    const fullInvoice = {
        id: invoice.id,
        status: isExpired ? 'expired' : invoice.status,
        date: new Date(invoice.date || invoice.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        due_date: new Date(invoice.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
        total: invoice.total,
        subtotal: invoice.subtotal || invoice.total, 
        tax: invoice.tax_amount || 0,
        discount: invoice.total_discount || 0,
        payment_method: invoice.payment_channel || invoice.payment_method, 
        plink_ref_no: realPlinkRef,
        payment_instructions: {
            va_number: invoice.va_number,
            expired_at: invoice.expired_at,
            qr_string: qrString,
            qr_image: qrImage,
            bank_code: (invoice.payment_channel || "").replace("VA_", ""),
            amount: invoice.total
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
  const { payment_method } = req.body; // e.g., 'MANUAL_TF', 'CASH'

  const client = await db.pool.connect();
  try {
      await client.query('BEGIN');

      // 1. Update Invoice Status
      const updateQuery = "UPDATE invoices SET status = 'paid', payment_method = $1, paid_at = NOW() WHERE id = $2";
      const result = await client.query(updateQuery, [payment_method, invoiceId]);

      if (result.rowCount === 0) {
          throw new Error("Invoice tidak ditemukan");
      }

      // 2. Trigger Domain Activation via OrderService
      const activationResult = await OrderService.activateDomain(invoiceId);

      await client.query('COMMIT');

      if (activationResult.success) {
          res.json({ message: "Payment Accepted & Domain Activated Successfully", status: "paid" });
      } else {
          res.json({ 
              message: "Payment Accepted but Domain Activation Failed: " + activationResult.message, 
              status: "paid",
              warning: true 
          });
      }
  } catch (err) {
      await client.query('ROLLBACK');
      console.error("[payInvoice] Error:", err);
      res.status(500).json({ error: err.message || "Gagal memperbarui status invoice" });
  } finally {
      client.release();
  }
};

// 4. Get All Invoices (Admin Only)
exports.getAllInvoices = async (req, res) => {
  const query = `
    SELECT i.*, u.name as customer_name, u.email as customer_email,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.invoice_id = i.id) > 0 as is_transfer
    FROM invoices i
    JOIN users u ON i.user_id = u.id
    ORDER BY i.created_at DESC
  `;

  try {
      const results = await db.query(query);
      res.json(results);
  } catch (err) {
      console.error("[getAllInvoices] Error:", err);
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
  
  const query = `
    SELECT i.*, 
    (SELECT name FROM invoice_items WHERE invoice_id = i.id LIMIT 1) as first_item,
    (SELECT COUNT(*) FROM transfer_requests tr WHERE tr.invoice_id = i.id) > 0 as is_transfer,
    (SELECT COUNT(*) FROM invoice_items WHERE invoice_id = i.id) as item_count
    FROM invoices i 
    WHERE i.user_id = $1 
    ORDER BY i.created_at DESC
  `;
  
  try {
      const results = await db.query(query, [userId]);
      res.json(results);
  } catch (err) {
      console.error("[getUserInvoicesAdmin] Error:", err);
      res.status(500).json({ error: "Gagal mengambil data invoice user" });
  }
};

const WalletService = require("../services/WalletService");

// 7. Pay Invoice with Wallet
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
           const couponRes = await client.query("SELECT id FROM coupons WHERE code = $1", [invoice.coupon_code]);
           if (couponRes.rows.length > 0) couponId = couponRes.rows[0].id;
        }

        // 3. Reserve Coupon (IF NOT ALREADY RESERVED OR TO RE-VALIDATE QUOTA)
        // Note: Even if already reserved at checkout, re-validating here during lock is safer.
        if (couponId) {

            await PromoEngine.reserveCoupon(userId, couponId, invoiceId, client);
        }

        // 4. Check Wallet Balance & Debit (Transactional)

        await WalletService.debit(userId, amount, 'PAYMENT', invoiceId, `Payment for Invoice #${invoiceId}`, client);

        // 5. Update Invoice Status
        await client.query(
            `UPDATE invoices SET status = 'paid', payment_method = 'WALLET', updated_at = NOW() WHERE id = $1`, 
            [invoiceId]
        );

        // CRITICAL: COMMIT TRANSACTION BEFORE API CALL (V-02 FIX)
        // This secures the funds. If the next steps fail, we have the money to refund.
        await client.query('COMMIT');

        // 6. Trigger Domain Activation / Service Provisioning

        
        // Identify service type from invoice items
        const itemRes = await client.query("SELECT action_type FROM invoice_items WHERE invoice_id = $1 LIMIT 1", [invoiceId]);
        const actionType = itemRes.rows[0]?.action_type || 'register';
        const isTransfer = actionType === 'transfer';
        const isTopUp = actionType === 'topup';

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

    const query = "UPDATE invoices SET status = 'cancelled', refund_reason = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 AND status = 'pending'";
    
    try {
        const result = await db.query(query, [reason, invoiceId, userId]);

        if (result.rowCount === 0 || result.affectedRows === 0) {
            return res.status(404).json({ error: "Invoice not found, already paid, or unauthorized" });
        }

        res.json({ message: "Invoice cancelled successfully", status: "cancelled" });
    } catch (err) {
        console.error("[cancelInvoice] Error:", err);
        res.status(500).json({ error: "Failed to cancel invoice" });
    }
};

