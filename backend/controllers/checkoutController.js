const db = require("../config/db");



const DaftarnamaService = require("../services/DaftarnamaService");
const InvoiceService = require("../services/InvoiceService");
const pricingController = require("./pricingController"); // If needed, or just query DB directly
const EmailService = require("../services/EmailService");
const voucherService = require("../services/VoucherService");

exports.processCheckout = async (req, res) => {
  let { userId, items, userVoucherCode, config } = req.body;
  
  if (!userId || !items || items.length === 0) {
      return res.status(400).json({ error: "Data checkout tidak lengkap" });
  }

  const client = await db.pool.connect();

  try {
      
      // 0. Fetch User Details
      const userRes = await client.query("SELECT name, email FROM users WHERE id = $1", [userId]);
      if (userRes.rows.length === 0) throw new Error("User tidak ditemukan");
      const user = userRes.rows[0];
      
      const pricingConfig = require("../config/pricingConfig");

      // --- PHASE 1: ITEM VALIDATION & PROMO CALCULATION ---
      const cartItems = [];

      for (const item of items) {
          if (parseInt(item.duration) < 1) throw new Error("Durasi tidak valid (min 1 tahun).");

          const domainName = item.name.toLowerCase();
          const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
          const match = domainName.match(tldRegex);
          const tld = match ? match[0] : "." + domainName.split('.').slice(1).join('.');
          const duration = parseInt(item.duration) || 1;
          const action = item.action || 'register';

          // Fetch Prices
          const priceRes = await client.query(
              `SELECT price_register, price_renew, price_transfer, price_restore, 
                      cost_register, cost_renew, cost_transfer, cost_restore, id as tld_id
               FROM pricing WHERE tld = $1`, 
              [tld]
          );

          if (priceRes.rows.length === 0) throw new Error(`TLD ${tld} tidak didukung.`);
          const p = priceRes.rows[0];
          
          let unitPrice = 0;
          let unitCost = 0;

          if (action === 'register') {
              unitPrice = parseFloat(p.price_register);
              unitCost = parseFloat(p.cost_register);
          } else if (action === 'renew') {
              unitPrice = parseFloat(p.price_renew);
              unitCost = parseFloat(p.cost_renew);
          } else if (action === 'transfer') {
              unitPrice = parseFloat(p.price_transfer);
              unitCost = parseFloat(p.cost_transfer);
          } else if (action === 'restore') {
              unitPrice = parseFloat(p.price_restore || 0);
              unitCost = parseFloat(p.cost_restore || 0);
          }

          cartItems.push({
              tld_id: p.tld_id,
              name: domainName,
              base_price: unitPrice,
              cost_price: unitCost,
              duration,
              action,
              tld
          });
      }

      // 2. Pricing & Voucher Integration
      const subtotal = cartItems.reduce((acc, i) => acc + (parseFloat(i.base_price) * (i.duration || 1)), 0);
      const totalCost = cartItems.reduce((acc, i) => acc + (parseFloat(i.cost_price) * (i.duration || 1)), 0);
      
      let totalDiscount = 0;
      let appliedVoucher = null;
      let voucherWarning = null;

      if (userVoucherCode) {
          try {
              const vResult = await voucherService.validateVoucherForCart(userId, userVoucherCode, cartItems);
              if (vResult.eligible) {
                  totalDiscount = vResult.discountAmount;
                  appliedVoucher = vResult.voucher;
                  appliedClaimId = vResult.claimId; // Store for linking later
                  console.log(`[Checkout] Voucher applied: ${userVoucherCode}, Discount: ${totalDiscount}, ClaimID: ${appliedClaimId}`);
              } else {
                  console.warn(`[Checkout] Voucher ${userVoucherCode} rejected: ${vResult.message}`);
                  voucherWarning = vResult.message;
              }
          } catch (vErr) {
              console.error(`[Checkout] Voucher Service Error:`, vErr.message);
              voucherWarning = "Gagal memverifikasi voucher.";
          }
      }

        // --- REFERRAL DISCOUNT INTEGRATION ---
        let referralDiscount = 0;
        const refResult = await require('../services/referralService').checkRefereeDiscountEligibility(userId);
        if (refResult.eligible) {
            referralDiscount = refResult.discountAmount;
            console.log(`[Checkout] User ${userId} is eligible for Referral Discount: ${referralDiscount}`);
        }

        const netAmount = Math.max(0, subtotal - totalDiscount - referralDiscount);

        const processedItems = cartItems.map(i => ({
            ...i,
            unit_price: parseFloat(i.base_price),
            total_line_price: parseFloat(i.base_price) * (i.duration || 1),
            original_line_price: parseFloat(i.base_price) * (i.duration || 1),
            applied_promo_event: null
        }));

        // --- PHASE 3: FINAL CALCULATIONS ---
        // Tax Standardized: (Subtotal - Discount) * 0.11
        const PPN_PERCENT = pricingConfig.PPN_PERCENT || 0.11;
        let taxAmount = 0;
        let invoiceTotal = 0;

        if (pricingConfig.TAX_INCLUSIVE) {
            invoiceTotal = netAmount;
            taxAmount = Math.floor(invoiceTotal - (invoiceTotal / (1 + PPN_PERCENT)));
        } else {
            taxAmount = Math.floor(netAmount * PPN_PERCENT);
            invoiceTotal = netAmount + taxAmount;
        }

      const profitAmount = netAmount - totalCost; // Profit before tax (Base Revenue - Cost)
      const profitMarginPercent = totalCost > 0 ? (profitAmount / totalCost) : 0;



      // --- PHASE 4: TRANSACTION & RESERVATION ---
      await client.query('BEGIN');

      // 0. EXTRA CHECK: Block if domain already in user account (for register action)
      for (const item of processedItems) {
          if (item.action === 'register') {
              const existingDomainRes = await client.query(
                  "SELECT id, status FROM domains WHERE user_id = $1 AND domain_name = $2",
                  [userId, item.name.toLowerCase()]
              );
              if (existingDomainRes.rows.length > 0) {
                  const dom = existingDomainRes.rows[0];
                  // If it exists, they shouldn't be registering it again.
                  // Except if it's failed and they want to try a fresh buy? 
                  // But usually, we want them to contact support or use the existing paid invoice.
                  // For now, let's block to prevent the "duplicate invoice" confusion.
                  await client.query('ROLLBACK');
                  return res.status(400).json({
                      success: false,
                      message: `Domain ${item.name} sudah ada di akun Anda. Silakan cek menu My Domains atau Billing.`
                  });
              }
          }
      }

      // 1. Check for Duplicate Pending Invoice (Deduplication)
      // Check if user already has a pending invoice with same total and items
      const existingInvRes = await client.query(
          `SELECT i.id 
           FROM invoices i
           WHERE i.user_id = $1 
             AND i.status = 'pending' 
             AND i.total = $2
           ORDER BY i.date DESC LIMIT 5`,
          [userId, invoiceTotal]
      );

      for (const row of existingInvRes.rows) {
          const invItems = await client.query(
              "SELECT name, action_type, years FROM invoice_items WHERE invoice_id = $1",
              [row.id]
          );
          
          if (invItems.rows.length === processedItems.length) {
              const isMatch = invItems.rows.every(dbItem => 
                  processedItems.some(pItem => 
                      pItem.name === dbItem.name && 
                      pItem.action === dbItem.action_type && 
                      pItem.duration === dbItem.years
                  )
              );

              if (isMatch) {
                  await client.query('COMMIT');
                  return res.json({
                      message: "Invoice sudah ada, silakan lanjutkan pembayaran.",
                      invoiceId: row.id,
                      invoiceNumber: row.id
                  });
              }
          }
      }

      // 2. Availability Check (Register Only)
      for (const item of processedItems) {
          if (item.action !== 'register') continue;
          // Skip if test domain or mock
          if (item.name.startsWith('security-test-')) continue;

          try {
              const avail = await DaftarnamaService.checkAvailability(item.name);
              if (!avail || !avail.data || !avail.data.available) {
                  throw new Error(`Domain ${item.name} sudah tidak tersedia.`);
              }
          } catch (e) {
               if (e.message.includes("tidak tersedia")) throw e;
               console.warn(`Warning: Availability check failed for ${item.name}, proceeding.`);
          }
      }

      const invoiceNumber = `INV-${Date.now()}-${Math.floor(Math.random()*1000)}`;

      // 3. Create Invoice using Service
      const calculationResults = {
          subtotal,
          totalDiscount: totalDiscount + referralDiscount, // Combined for backend record
          netAmount,
          taxAmount,
          finalAmount: invoiceTotal,
          totalCost,
          profitAmount,
          profitMarginPercent,
          taxSubsidyAmount: 0
      };

      const invoiceResult = await InvoiceService.create(
          userId, 
          processedItems, 
          userVoucherCode || null, // userVoucherCode as coupon_code
          client, 
          calculationResults,
          config || {},
          invoiceNumber,
          'DOMAIN'
      );

      // 4. Link Voucher Claim if applicable
      if (appliedVoucher && appliedClaimId) {
          await client.query(
              "UPDATE voucher_claims SET invoice_id = $1 WHERE id = $2",
              [invoiceNumber, appliedClaimId]
          );
          console.log(`[Checkout] Claim ${appliedClaimId} linked to invoice ${invoiceNumber}`);
      }

      await client.query('COMMIT');

      // Send Email
      EmailService.send('INVOICE_PENDING', {
          to: user.email, 
          user: user,
          invoice: { id: invoiceNumber, total: invoiceTotal },
          items: processedItems
      }).catch(e => console.error("Email Error:", e));

      res.json({
          message: voucherWarning ? `Invoice dibuat, namun: ${voucherWarning}` : "Invoice berhasil dibuat",
          invoiceId: invoiceNumber,
          invoiceNumber: invoiceNumber,
          voucherApplied: !!appliedVoucher,
          voucherWarning: voucherWarning
      });

  } catch (err) {
      await client.query('ROLLBACK');
      console.error("[Checkout] Failed:", err);
      if (err.response) {
          console.error("[Checkout] Registrar Response Data:", JSON.stringify(err.response.data, null, 2));
      }
      res.status(400).json({ error: err.message, details: err.response?.data });
  } finally {
      client.release();
  }
};

exports.processTopUp = async (req, res) => {
    const { userId, amount } = req.body;
    
    if (!userId || !amount || isNaN(amount) || amount < 10000) {
        return res.status(400).json({ error: "Invalid Top-Up Data. Min amount 10.000" });
    }

    const client = await db.pool.connect();
    
    try {
        

        // 1. Verify User
        const userRes = await client.query("SELECT email FROM users WHERE id = $1", [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: "User not found" });

        // 2. Prepare Calculation Results (Simple pass-through)
        const total = parseFloat(amount);
        const calculationResults = {
            subtotal: total,
            totalDiscount: 0,
            netAmount: total,
            taxAmount: 0,
            finalAmount: total,
            totalCost: 0,
            profitAmount: 0,
            profitMarginPercent: 0,
            taxSubsidyAmount: 0
        };

        // 3. Prepare Item
        const items = [{
            name: "Wallet Top Up",
            description: "Saldo Wallet",
            action: "topup",
            duration: 1, // Dummy
            unit_price: total,
            total_line_price: total,
            cost_price: 0,
            pricing_source: "manual"
        }];

        // 4. Create Invoice
        const invoiceResult = await InvoiceService.create(userId, items, null, client, calculationResults, {}, null, 'TOPUP');
        
        res.status(200).json({
            message: "Top Up Invoice Created",
            invoiceId: invoiceResult.invoiceId,
            total: total
        });

    } catch (err) {
        console.error("[TopUp] Failed:", err);
        res.status(500).json({ error: "Failed to create Top Up invoice" });
    } finally {
        client.release();
    }
};

/**
 * calculateCartPreview
 * Provides real-time pricing and promo application for the frontend.
 * DRY-RUN only, no DB mutations.
 */
exports.calculateCartPreview = async (req, res) => {
    const { items, userVoucherCode, userId } = req.body;
    
    if (!items || items.length === 0) {
        return res.status(400).json({ error: "Cart is empty" });
    }

    const client = await db.pool.connect();
    try {
        const pricingConfig = require("../config/pricingConfig");
        const cartItems = [];

        for (const item of items) {
            const domainName = item.name.toLowerCase();
            const tldRegex = /\.[a-z]{2,}(\.[a-z]{2})?$/;
            const match = domainName.match(tldRegex);
            const tld = match ? match[0] : "." + domainName.split('.').slice(1).join('.');
            const action = item.action || 'register';

            const priceRes = await client.query(
                `SELECT price_register, price_renew, price_transfer, price_restore, 
                        cost_register, cost_renew, cost_restore, id as tld_id
                 FROM pricing WHERE tld = $1`, 
                [tld]
            );

            if (priceRes.rows.length === 0) {
                console.warn(`[CheckoutController] Pricing not found for TLD ${tld} (Domain: ${domainName}). Skipping item.`);
                continue;
            }

            const p = priceRes.rows[0];
            let unitPrice = 0;
            let unitCost = 0;

            if (action === 'register') unitPrice = p.price_register;
            else if (action === 'renew') unitPrice = p.price_renew;
            else if (action === 'transfer') unitPrice = p.price_transfer;
            else if (action === 'restore') unitPrice = p.price_restore;

            if (action === 'register') unitCost = p.cost_register;
            else if (action === 'renew') unitCost = p.cost_renew;
            else if (action === 'transfer') unitCost = p.cost_transfer;
            else if (action === 'restore') unitCost = p.cost_restore;

            cartItems.push({
                tld_id: p.tld_id,
                name: domainName,
                base_price: unitPrice,
                cost_price: unitCost,
                duration: item.duration || 1,
                action,
                tld
            });
        }

        // --- VOUCHER PREVIEW INTEGRATION ---
        const subtotal = cartItems.reduce((sum, item) => sum + (item.base_price * item.duration), 0);
        
        let totalDiscount = 0;
        let voucherWarning = null;
        let appliedVoucher = null;

        // Support userId from body (preferred for preview) or req.user (if auth exists)
        const activeUserId = userId || req.user?.id;

        if (userVoucherCode && activeUserId) {
            const vResult = await voucherService.validateVoucherForCart(activeUserId, userVoucherCode, cartItems);
            if (vResult.eligible) {
                totalDiscount = vResult.discountAmount;
                appliedVoucher = vResult.voucher;
            } else {
                voucherWarning = vResult.message;
            }
        }

        // --- REFERRAL DISCOUNT INTEGRATION ---
        let referralDiscount = 0;
        if (activeUserId) {
            const refResult = await require('../services/referralService').checkRefereeDiscountEligibility(activeUserId);
            if (refResult.eligible) {
                referralDiscount = refResult.discountAmount;
            }
        }

        const netAmount = Math.max(0, subtotal - totalDiscount - referralDiscount);

        // Calculate Tax Standardized
        const PPN_RATE = pricingConfig.PPN_PERCENT !== undefined ? pricingConfig.PPN_PERCENT : 0.11;
        let taxAmount = 0;
        let finalTotal = 0;
        
        if (pricingConfig.TAX_INCLUSIVE) {
            finalTotal = netAmount;
            taxAmount = Math.floor(finalTotal - (finalTotal / (1 + PPN_RATE)));
        } else {
            taxAmount = Math.floor(netAmount * PPN_RATE);
            finalTotal = netAmount + taxAmount;
        }

        res.json({
            items: cartItems.map(it => ({
                ...it,
                item_subtotal: it.base_price * it.duration,
                effective_price: it.base_price * it.duration
            })),
            subtotal: subtotal,
            total_discount: totalDiscount,
            referral_discount: referralDiscount,
            voucher_warning: voucherWarning,
            voucher_details: appliedVoucher,
            net_amount: netAmount,
            tax_amount: taxAmount,
            total_payable: finalTotal
        });

    } catch (err) {
        console.error("[Preview] Failed:", err.message);
        res.status(500).json({ error: "Gagal menghitung ringkasan belanja" });
    } finally {
        client.release();
    }
};
