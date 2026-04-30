const db = require('../config/db');
const DaftarnamaService = require('./DaftarnamaService');
const EmailService = require('./EmailService');
const AlertService = require('./AlertService');
const DomainLoggingService = require('./DomainLoggingService');
const TransferController = require('../controllers/transferController');

class OrderService {
    
    /**
     * Helper: Log Activity
     */
    async logActivity(client, invoiceId, action, description = '', userType = 'system') {
        try {
            const query = `INSERT INTO activity_logs (invoice_id, action, description, user_type) VALUES ($1, $2, $3, $4)`;
            await client.query(query, [invoiceId, action, description, userType]);
        } catch (e) {
            console.error("Failed to log activity:", e);
        }
    }

    /**
     * Activate Domain for a given Invoice
     * IMPLEMENTS: LOCKING, RE-CHECK AVAILABILITY, DETAILED AUDITING
     */
    async activateDomain(invoiceId) {
        const client = await db.pool.connect();
        try {

            
            // 1. START TRANSACTION & LOCK INVOICE
            await client.query('BEGIN');
            
            // Lock the invoice row to prevent concurrent activation attempts
            const invoiceLockQuery = `SELECT id, user_id, status, total, checkout_config FROM invoices WHERE id = $1 FOR UPDATE`;
            const invoiceRes = await client.query(invoiceLockQuery, [invoiceId]);
            
            if (invoiceRes.rows.length === 0) {
                throw new Error("Invoice tidak ditemukan");
            }
            const invoice = invoiceRes.rows[0];
            const checkoutConfig = invoice.checkout_config || {};

            // 2. FETCH ITEMS & USER
            const itemsQuery = `SELECT * FROM invoice_items WHERE invoice_id = $1`;
            const itemsRes = await client.query(itemsQuery, [invoiceId]);
            
            const userQuery = `SELECT * FROM users WHERE id = $1`;
            const userRes = await client.query(userQuery, [invoice.user_id]);
            const user = userRes.rows[0];

            if (!user) throw new Error("User data missing");

            // --- REGISTRAR BALANCE PRE-CHECK (Optimization) ---
            const RegistrarBalanceService = require('./RegistrarBalanceService');
            // --------------------------------------------------

            // 3. PROCESS EACH DOMAIN ITEM
            for (const item of itemsRes.rows) {
                const domainName = item.name;
                const actionType = item.action_type || 'register';

                try {
                    // --- A. GET COST PRICE ---
                    const knownTldsRes = await client.query("SELECT tld FROM pricing");
                    const allKnownTlds = knownTldsRes.rows.map(r => r.tld);
                    
                    let tld = domainName.substring(domainName.lastIndexOf('.'));
                    // Check if domain ends with any known complex TLD (longest match first)
                    const sortedTlds = allKnownTlds.sort((a, b) => b.length - a.length);
                    for (const tk of sortedTlds) {
                        if (domainName.toLowerCase().endsWith(tk.toLowerCase())) {
                            tld = tk;
                            break;
                        }
                    }
                const pricingRes = await client.query("SELECT cost_register, cost_renew, cost_restore FROM pricing WHERE tld = $1", [tld]);
                
                let estimatedCost = 0;
                if (pricingRes.rows.length > 0) {
                    if (actionType === 'register') estimatedCost = parseFloat(pricingRes.rows[0].cost_register || 0);
                    else if (actionType === 'renew') estimatedCost = parseFloat(pricingRes.rows[0].cost_renew || 0);
                    else if (actionType === 'restore') estimatedCost = parseFloat(pricingRes.rows[0].cost_restore || 0);
                }
                
                // Multiply by years if not restore
                if (actionType !== 'restore') {
                    estimatedCost = estimatedCost * (item.years || 1);
                }

                    // --- NEW: INITIAL UPSERT TO ENSURE VISIBILITY ---
                    if (actionType === 'register') {
                        await this.upsertDomainStatus(client, user.id, domainName, 'registering', {
                            registrar_name: 'daftarnama',
                            reason: "Awaiting balance & availability check",
                            auto_renew: !!checkoutConfig.autoRenew,
                            whois_privacy: !!checkoutConfig.whoisPrivacy
                        });

                        // --- B. CHECK BALANCE SUFFICIENCY ---
                    if (estimatedCost > 0) {
                        const balanceData = await RegistrarBalanceService.getBalance('daftarnama');
                        if (!balanceData || parseFloat(balanceData.current_balance) < estimatedCost) {
                            throw new Error(`Insufficient Registrar Balance. Required: ${estimatedCost}, Available: ${balanceData?.current_balance || 0}`);
                        }
                    }
                        // --- REGISTRATION LOGIC ---

                        // A. STRICT DATA VALIDATION & CLEANUP
                        let cleanPhone = (user.phone || '08123456789').replace(/\D/g, '');
                        if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.substring(1);
                        if (!cleanPhone.startsWith('62')) cleanPhone = '62' + cleanPhone;
                        const finalPhone = '+62.' + cleanPhone.substring(2);

                        const countryCode = (user.country && user.country.length === 2) ? user.country.toUpperCase() : 'ID';
                        const city = user.city || 'Jakarta';
                        const province = user.state || 'DKI Jakarta';
                        const address = user.address_line1 || user.address || 'Jl. Digital No. 1';
                        const zip = user.zip_code || '12345';
                        const name = user.name || 'Valued Customer';
                        const company = user.company || 'Individual';
                        const email = user.email;

                        // B. CHECK FOR EXISTING CONTACT HANDLE (REUSE)
                        let username, withExisting;
                        
                        // Check if we already have a verified handle for this user
                        // We query the DB again just to be sure we have latest data if concurrent
                        const freshUserRes = await client.query("SELECT registrar_customer_id FROM users WHERE id = $1", [user.id]);
                        const existingHandle = freshUserRes.rows[0]?.registrar_customer_id;

                        if (existingHandle) {

                            username = existingHandle;
                            withExisting = true;
                        } else {

                            username = email.split('@')[0] + Date.now().toString().slice(-4);
                            withExisting = false;
                        }

                        const password = process.env.REGISTRAR_DEFAULT_PASS || 'DomainUser123!';

                        await this.upsertDomainStatus(client, user.id, domainName, 'registering', {
                            registrant_snapshot: { name, email, phone: finalPhone, username },
                            registrar_name: 'daftarnama',
                            auto_renew: !!checkoutConfig.autoRenew,
                            whois_privacy: !!checkoutConfig.whoisPrivacy
                        });

                        // C. RE-CHECK AVAILABILITY
                        const avail = await DaftarnamaService.checkAvailability(domainName);
                        if (!avail || !avail.data || !avail.data.available) {
                             throw new Error("DOMAIN_TAKEN");
                        }

                        // D. PREPARE PAYLOAD
                        const registrationPayload = {
                            domain_name: domainName,
                            duration: item.years || 1,
                            nameservers: ["ns1.daftarnama.id", "ns2.daftarnama.id"],
                            with_existing_customer: withExisting, // <--- KEY CHANGE
                            username: username,
                            password: password,
                            name: name,
                            company_name: company,
                            email: email,
                            address_1: address,
                            city: city,
                            province: province,
                            postal_code: zip,
                            country: countryCode,
                            phone_number: finalPhone
                        };

                        // E. EXECUTE REGISTRATION
                        const regResult = await DaftarnamaService.registerDomain(registrationPayload);
                        
                        // F. HANDLE RESULT & SAVE HANDLE IF NEW
                        const regResultStatus = (regResult?.status || '').toLowerCase();
                        const regResultMessage = (regResult?.message || '').toLowerCase();

                        const isPartialSuccess = regResult && (
                            regResultStatus === 'provisioned' || 
                            regResultStatus === 'provisioning' ||
                            regResultStatus === 'pending_document' ||
                            regResultStatus === 'pending' ||
                            regResultMessage.includes('document') ||
                            regResultMessage.includes('requirement') ||
                            regResultMessage.includes('provisioned')
                        );

                        if (regResult && (regResult.success || regResult.code === 201 || isPartialSuccess)) {
                            
                            // *** CRITICAL: SAVE NEW HANDLE FOR FUTURE REUSE ***
                            if (!withExisting && !isPartialSuccess) {
                                // We assume if it's not partial success (i.e. active immediately), the contact is good.
                                // Note: Daftarnama might return the created customer ID in response, but we used 'username' as key.
                                // We'll store the username we sent.

                                await client.query("UPDATE users SET registrar_customer_id = $1 WHERE id = $2", [username, user.id]);
                            }

                            const regData = regResult.data || {};
                            const finalStatus = isPartialSuccess ? 'provisioned' : 'active';
                            
                            await this.upsertDomainStatus(client, user.id, domainName, finalStatus, {
                                registrar_name: 'Daftarnama',
                                registrar_order_id: regResult.order_id || regData.order_id,
                                registrar_domain_id: regData.domain_id,
                                registered_at: new Date(),
                                expiration_date: regData.expiry_date,
                                registration_date: regData.registration_date,
                                reason: isPartialSuccess ? "Registration PENDING DOCUMENT" : "Registration SUCCESS",
                                registrar_response_raw: regResult,
                                auto_renew: !!checkoutConfig.autoRenew,
                                whois_privacy: !!checkoutConfig.whoisPrivacy
                            });
                            
                            const logMsg = isPartialSuccess 
                                ? `Pendaftaran ${domainName} masuk (Menunggu Dokumen)` 
                                : `Berhasil registrasi: ${domainName}`;
                            
                            await this.logActivity(client, invoiceId, isPartialSuccess ? "Pending Dokumen" : "Domain Aktif", logMsg);


                            // NOTIFICATION: Domain Status Change
                            const NotificationService = require('./NotificationService');
                            if (isPartialSuccess) {
                                await NotificationService.createNotification(user.id, 
                                    "Menunggu Dokumen", 
                                    `Pendaftaran ${domainName} telah diterima, namun memerlukan dokumen tambahan untuk verifikasi registrar.`, 
                                    'warning', domainName, 'domain_activation');
                            } else {
                                // --- DEDUCT BALANCE (Success) ---
                                if (estimatedCost > 0) {
                                    await RegistrarBalanceService.addMutation('daftarnama', 'debit', estimatedCost, `Register: ${domainName}`, invoiceId, client);
                                }
                                // --------------------------------

                                await NotificationService.createNotification(user.id, 
                                    "Domain Aktif!", 
                                    `Selamat! Domain ${domainName} Anda sekarang sudah aktif dan siap digunakan.`, 
                                    'success', domainName, 'domain_activation');
                            }
                        } else {
                            throw new Error(regResult?.message || "Registrar registration failed");
                        }

                    } else if (actionType === 'renew') {
                        // --- RENEWAL LOGIC ---
                        console.log(`[OrderService] Executing API Renewal for ${domainName}`);
                        
                        // Daftarnama v2 requires current_expiry_date
                        const { rows: domainRows } = await client.query("SELECT expiration_date FROM domains WHERE domain_name = $1", [domainName]);
                        let currentExpiryStr = null;
                        if (domainRows.length > 0 && domainRows[0].expiration_date) {
                            const d = new Date(domainRows[0].expiration_date);
                            currentExpiryStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                        }

                        const renewResult = await DaftarnamaService.renewDomain(domainName, item.years || 1, currentExpiryStr);
                        
                        if (renewResult && (renewResult.success || renewResult.code === 200)) {
                            const renewData = renewResult.data || {};
                            
                            // Calculate new expiry locally if API doesn't return it
                            let newExpiry = renewData.expiry_date;
                            if (!newExpiry && domainRows.length > 0) {
                                const d = new Date(domainRows[0].expiration_date);
                                d.setFullYear(d.getFullYear() + (item.years || 1));
                                newExpiry = d;
                            }

                            await this.upsertDomainStatus(client, user.id, domainName, 'active', {
                                expiration_date: newExpiry,
                                reason: `Renewal SUCCESS (${item.years} year(s))`
                            });
                            await this.logActivity(client, invoiceId, "Domain Diperpanjang", `Berhasil perpanjang: ${domainName}`);
                            
                            // --- DEDUCT BALANCE (Renew) ---
                            if (estimatedCost > 0) {
                                await RegistrarBalanceService.addMutation('daftarnama', 'debit', estimatedCost, `Renew: ${domainName}`, invoiceId, client);
                            }
                            // ------------------------------

                            // NOTIFICATION: Renewal Success
                            const NotificationService = require('./NotificationService');
                            await NotificationService.createNotification(user.id, 
                                "Domain Diperpanjang", 
                                `Masa aktif domain ${domainName} Anda telah berhasil diperpanjang.`, 
                                'success', domainName, 'domain_renewal');
                        } else {
                            throw new Error(renewResult?.message || "Registrar renewal failed");
                        }

                    } else if (actionType === 'restore') {
                        // ... restore logic ...
                        console.log(`[OrderService] Executing API Restoration for ${domainName}`);
                        const restoreResult = await DaftarnamaService.restoreDomain(domainName);
                        
                        if (restoreResult && (restoreResult.success || restoreResult.code === 200)) {
                            const restoreData = restoreResult.data || {};
                            await this.upsertDomainStatus(client, user.id, domainName, 'active', {
                                expiration_date: restoreData.expiry_date,
                                reason: "Restoration (Redemption) SUCCESS"
                            });
                            await this.logActivity(client, invoiceId, "Domain Dipulihkan", `Berhasil pemulihan: ${domainName}`);

                            // --- DEDUCT BALANCE (Restore) ---
                            if (estimatedCost > 0) {
                                await RegistrarBalanceService.addMutation('daftarnama', 'debit', estimatedCost, `Restore: ${domainName}`, invoiceId, client);
                            }
                            // --------------------------------

                            // NOTIFICATION: Restoration Success
                            const NotificationService = require('./NotificationService');
                            await NotificationService.createNotification(user.id, 
                                "Domain Dipulihkan", 
                                `Domain ${domainName} Anda telah berhasil dipulihkan dari masa tenggang (redemption).`, 
                                'success', domainName, 'domain_restoration');
                        } else {
                            throw new Error(restoreResult?.message || "Registrar restoration failed");
                        }
                    } else if (actionType === 'transfer') {
                        // --- TRANSFER LOGIC ---
                        console.log(`[OrderService] Routing Transfer for ${domainName} to TransferController (Background)`);
                        // Run in background to prevent slow API from hanging the payment confirmation
                        TransferController.processTransfer(invoiceId);
                    }

                    // Send Success Email (Branched by Action Type)
                    if (actionType === 'renew') {
                        // For renewal, we should have expiration_date from earlier in the loop
                        // Let's re-fetch the latest data to be safe for the email
                        const latestDomain = await client.query("SELECT expiration_date FROM domains WHERE domain_name = $1", [domainName]);
                        const expiry = latestDomain.rows[0]?.expiration_date;
                        
                        EmailService.sendDomainRenewSuccess(user, domainName, item.years || 1, expiry)
                            .catch(e => console.error("Renew Email Error:", e));
                    } else {
                        EmailService.send('DOMAIN_ACTIVE', {
                            to: user.email,
                            user: user,
                            domain: domainName,
                            action: actionType
                        }).catch(e => console.error("Activation Email Error:", e));
                    }

                } catch (err) {
                    const errorMsg = err.response?.data?.message || err.message;
                    console.error(`[OrderService] Fulfillment Error for ${domainName}:`, errorMsg);
                    
                    // FALLBACK: Detect if the "error" is actually a pending document state
                    const isActuallyPending = errorMsg.toLowerCase().includes('document') || 
                                           errorMsg.toLowerCase().includes('requirement') ||
                                           errorMsg.toLowerCase().includes('provisioned') ||
                                           errorMsg.toLowerCase().includes('provisioning') ||
                                           errorMsg.toLowerCase().includes('pending');

                    if (actionType === 'register' && isActuallyPending) {
                        console.log(`[OrderService] Detected Partial Success (Pending Doc) in catch block for ${domainName}`);
                        await this.upsertDomainStatus(client, user.id, domainName, 'provisioned', {
                            registrar_name: 'Daftarnama',
                            reason: "Registration PENDING DOCUMENT (Detected from error message)",
                            error: errorMsg
                        });
                        await this.logActivity(client, invoiceId, "Pending Dokumen", `Pendaftaran ${domainName} masuk (Menunggu Dokumen)`);
                    } else if (actionType === 'register') {
                        const isTaken = errorMsg.includes("DOMAIN_TAKEN") || errorMsg.toLowerCase().includes("taken");
                        const rawResponse = err.response?.data || null;

                        // --- AUTO-FIX: Handle Stale Customer Handle ---
                        if (errorMsg.includes("Customer not found")) {
                            console.warn(`[OrderService] 🛠️ STALE HANDLE DETECTED: ${user.registrar_customer_id} not found at Registrar. Clearing for user ${user.id}.`);
                            await client.query("UPDATE users SET registrar_customer_id = NULL WHERE id = $1", [user.id]);
                        }
                        // ----------------------------------------------

                        await this.handleFailedRegistration(client, invoiceId, domainName, user, errorMsg, isTaken, rawResponse);
                    } else {
                        // For Renew/Restore, we just log failure and keep status as is or mark to investigation
                        await this.logActivity(client, invoiceId, "Fulfillment Gagal", `${actionType} gagal untuk ${domainName}: ${errorMsg}`);
                        AlertService.sendAlert('CRITICAL', `Gagal ${actionType}: ${domainName}`, { invoiceId, errorMsg });
                    }
                }
            }

            // 4. FINAL STATUS UPDATE: Mark Invoice as PAID
            await client.query("UPDATE invoices SET status = 'paid', updated_at = NOW() WHERE id = $1", [invoiceId]);

            await client.query('COMMIT');
            return { success: true };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error(`[OrderService] FATAL Activation Error:`, error.message);
            
            // Map specific errors to types for controller handling
            let errorType = 'UNKNOWN';
            if (error.message.includes("DOMAIN_TAKEN")) errorType = 'DOMAIN_TAKEN';
            else if (error.message.includes("Insufficient Registrar Balance")) errorType = 'BALANCE_ERROR';

            return { success: false, message: error.message, errorType };
        } finally {
            client.release();
        }
    }

    /**
     * Helper: Upsert Domain Status & Audit Fields
     */
    async upsertDomainStatus(client, userId, domainName, status, extra = {}) {
        const query = `
            INSERT INTO domains (
                user_id, domain_name, status, 
                registrar_name, registrar_order_id, registrar_domain_id, 
                registrar_response_raw, last_registration_error, 
                registration_attempt_count, registered_at,
                expiration_date, registration_date,
                registrant_snapshot, auto_renew, whois_privacy,
                created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12, $13, $14, NOW(), NOW())
            ON CONFLICT (domain_name) DO UPDATE SET 
                user_id = EXCLUDED.user_id,
                status = EXCLUDED.status,
                registrar_order_id = COALESCE(EXCLUDED.registrar_order_id, domains.registrar_order_id),
                registrar_domain_id = COALESCE(EXCLUDED.registrar_domain_id, domains.registrar_domain_id),
                registrar_response_raw = COALESCE(EXCLUDED.registrar_response_raw, domains.registrar_response_raw),
                last_registration_error = EXCLUDED.last_registration_error,
                registration_attempt_count = domains.registration_attempt_count + CASE WHEN EXCLUDED.status = 'registering' THEN 1 ELSE 0 END,
                registered_at = COALESCE(EXCLUDED.registered_at, domains.registered_at),
                expiration_date = COALESCE(EXCLUDED.expiration_date, domains.expiration_date),
                registration_date = COALESCE(EXCLUDED.registration_date, domains.registration_date),
                registrant_snapshot = COALESCE(EXCLUDED.registrant_snapshot, domains.registrant_snapshot),
                auto_renew = COALESCE(EXCLUDED.auto_renew, domains.auto_renew),
                whois_privacy = COALESCE(EXCLUDED.whois_privacy, domains.whois_privacy),
                updated_at = NOW()
        `;
        const params = [
            userId, domainName, status,
            extra.registrar_name || 'daftarnama',
            extra.registrar_order_id || null,
            extra.registrar_domain_id || null,
            extra.registrar_response_raw ? JSON.stringify(extra.registrar_response_raw) : null,
            extra.error || null,
            extra.registered_at || null,
            extra.expiration_date || null,
            extra.registration_date || null,
            extra.registrant_snapshot ? JSON.stringify(extra.registrant_snapshot) : null,
            extra.auto_renew !== undefined ? extra.auto_renew : false,
            extra.whois_privacy !== undefined ? extra.whois_privacy : false
        ];
        await client.query(query, params);

        // Logging Audit (Phase H)
        // We need to get the previous status if possible, or just log to_status
        await DomainLoggingService.log(null, null, status, extra.reason || "Status updated via OrderService", extra.registrar_response_raw, domainName);
        // Note: passing null for ID here because we don't always have internal domain ID yet in this helper
        // Ideally we should fetch the ID first
    }

    /**
     * Helper: Handle Registration Failure
     */
    async handleFailedRegistration(client, invoiceId, domainName, user, errorMsg, isTaken = false, rawResponse = null) {
        // Calculate next retry (Phase H: first retry in 2 minutes)
        const nextRetryAt = new Date(Date.now() + 2 * 60000); 

        // 1. Update Domain Status to failed
        const sql = `
            UPDATE domains 
            SET status = 'failed', 
                last_registration_error = $1, 
                registrar_response_raw = $2,
                next_retry_at = $3,
                updated_at = NOW() 
            WHERE domain_name = $4
        `;
        await client.query(sql, [errorMsg, rawResponse ? JSON.stringify(rawResponse) : null, isTaken ? null : nextRetryAt, domainName]);
        
        // 2. Log Activity
        await this.logActivity(client, invoiceId, "Fulfillment Gagal", `Domain: ${domainName}. Error: ${errorMsg}`);

        // 3. Trigger Admin Alert
        const level = isTaken ? 'WARNING' : 'CRITICAL';
        AlertService.sendAlert(level, `Fulfillment Gagal: ${errorMsg}`, { invoiceId, domainName });

        // 4. Auto-Refund Logic (If Taken)
        if (isTaken) {
             console.log(`[OrderService] Triggering AUTO-REFUND for ${domainName} due to Taken status.`);
             // Update Invoice to REFUNDED (Simplified: In real world, might only refund part of invoice)
             await client.query(`UPDATE invoices SET status = 'REFUNDED', refunded_at = NOW(), refund_reason = $1 WHERE id = $2`, 
                [`Domain ${domainName} taken during checkout`], invoiceId);
             
             // TODO: Trigger Gateway Refund API if supported by PrismaLink
        } else {
             // Notify user about manual processing
             EmailService.send('TEST', {
                 to: user.email,
                 subject: "Update Pesanan Domain Anda",
                 message: `Kami mendapati masalah saat mengaktifkan domain ${domainName}. Tim kami sedang menangani masalah ini secara manual. Harap tunggu maks 1x24 jam.`
             }).catch(e => {});
        }
    }
}

module.exports = new OrderService();
