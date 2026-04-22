const db = require("../config/db");
const DaftarnamaService = require("../services/DaftarnamaService");
const DomainLoggingService = require("../services/DomainLoggingService");

class DomainSyncWorker {
    constructor() {
        this.isProcessing = false;
        this.backoffIntervals = [2, 4, 8, 16, 32]; // in minutes
    }

    /**
     * Start the worker with a cron-like interval
     * @param {number} intervalMs Default 5 minutes (300000ms)
     */
    start(intervalMs = 300000) {
        console.log(`[DomainSyncWorker] Started (Interval: ${intervalMs}ms)`);
        
        // Initial run
        setTimeout(() => {
            this.process().catch(err => console.error("[DomainSyncWorker] Fatal Start Error:", err));
        }, 5000); // Give DB/Redis a moment to settle

        setInterval(() => {
            this.process().catch(err => console.error("[DomainSyncWorker] Fatal Interval Error:", err));
        }, intervalMs);
    }

    async process() {
        if (this.isProcessing) return;
        this.isProcessing = true;



        try {
            // 1. Fetch domains that need attention
            // - PAID: New domain awaiting registration
            // - FAILED: Retrying previous failures
            // - ACTIVE/PROVISIONED: Periodic sync
            const sql = `
                SELECT d.*, u.email, u.name as user_name, u.phone, u.state, u.city, u.address_line1 as address
                FROM domains d
                JOIN users u ON d.user_id = u.id
                WHERE d.status IN ('paid', 'failed', 'provisioning', 'provisioned', 'active', 'registering')
                AND (
                    d.next_retry_at IS NULL 
                    OR d.next_retry_at <= CURRENT_TIMESTAMP
                    OR d.last_sync_at IS NULL
                    OR d.last_sync_at <= CURRENT_TIMESTAMP - INTERVAL '1 hour'
                )
                ORDER BY d.updated_at ASC
                LIMIT 10
            `;

            const { rows: domains } = await db.pool.query(sql);

            for (const domain of domains) {
                await this.syncDomain(domain);
            }

        } catch (err) {
            console.error("[DomainSyncWorker] Cycle Error:", err.message);
        } finally {
            this.isProcessing = false;

        }
    }

    async syncDomain(domain) {


        try {
            if (domain.status === 'paid' || domain.status === 'failed' || domain.status === 'registering') {
                await this.handleRegistration(domain);
            } else {
                await this.handleStatusCheck(domain);
            }
        } catch (err) {
            console.error(`[DomainSyncWorker] Error syncing ${domain.domain_name}:`, err.message);
        }
    }

    async handleRegistration(domain) {
        // Logic similar to OrderService.activateDomain but within worker context
        try {
            // Update status to prevent double processing if cycle overlaps
            await db.pool.query("UPDATE domains SET status = 'registering', updated_at = NOW() WHERE id = $1", [domain.id]);

            // For simplicity, we assume we have enough data (nameservers etc)
            // Ideally we'd pull full registrant data from User if not stored on domain
            const payload = {
                domain_name: domain.domain_name,
                duration: 1,
                nameservers: domain.nameservers || ["ns1.daftarnama.id", "ns2.daftarnama.id"],
                with_existing_customer: false,
                username: "u" + domain.user_id + "_" + Date.now().toString().slice(-4),
                password: "Pass" + Math.random().toString(36).slice(-8) + "!",
                name: domain.user_name || "Customer",
                company_name: "Individual",
                email: domain.email,
                address_1: domain.address || "Jl. Alamat",
                city: domain.city || "Jakarta",
                province: domain.state || "DKI Jakarta",
                postal_code: "12345",
                country: "ID",
                phone_number: this.normalizePhone(domain.phone || "+628123456789")
            };

            const response = await DaftarnamaService.registerDomain(payload);

            if (response?.code === 201 || response?.data?.status === 'ACTIVE') {
                 await this.markSuccess(domain, response);
            } else if (response?.data?.status === 'PENDING' || response?.data?.status === 'PROVISIONING') {
                 await this.markProvisioning(domain, response);
            } else {
                 throw new Error(response?.message || "Unknown registrar response");
            }

        } catch (error) {
            await this.handleFailure(domain, error);
        }
    }

    async handleStatusCheck(domain) {
        try {
            const info = await DaftarnamaService.getDomainInfo(domain.domain_name);
            if (!info) return;

            const registrarStatus = info.data?.status?.toLowerCase();
            const expiryDate = info.data?.expiry_date;
            const regDate = info.data?.registration_date;

            let localStatus = registrarStatus; 
            // Map registrar statuses to our local statuses if different
            if (registrarStatus === 'active') localStatus = 'active';

            await db.pool.query(
                "UPDATE domains SET status = $1, expiration_date = $2, registration_date = $3, last_sync_at = NOW(), last_document_sync_at = NOW(), updated_at = NOW() WHERE id = $4",
                [localStatus, expiryDate, regDate, domain.id]
            );

            // Log if status changed
            if (localStatus !== domain.status) {
                await DomainLoggingService.log(domain.id, domain.status, localStatus, "Synchronized with registrar");
            }
        } catch (err) {
            console.error(`[DomainSyncWorker] Sync failed for ${domain.domain_name}:`, err.message);
        }
    }

    async markSuccess(domain, response) {
        let sql = `
            UPDATE domains 
            SET status = $1, 
                expiration_date = $2, 
                registrar_response_raw = $3, 
                nameservers = $4,
                is_locked = $5,
                last_sync_at = NOW(),
                last_document_sync_at = NOW(),
                updated_at = NOW()
            WHERE id = $6
        `;
        await db.pool.query(sql, ['active', response.data?.expiry_date || null, response, domain.nameservers || ["ns1.daftarnama.id", "ns2.daftarnama.id"], false, domain.id]);
        await DomainLoggingService.log(domain.id, domain.status, 'active', "Registration Success", response);

    }

    async markProvisioning(domain, response) {
        await db.pool.query("UPDATE domains SET status = 'provisioned', updated_at = NOW() WHERE id = $1", [domain.id]);
        await DomainLoggingService.log(domain.id, domain.status, 'provisioned', "Registrar Provisioning", response);
    }

    async handleFailure(domain, error) {
        const errorData = error.response?.data || { message: error.message };
        const newCount = (domain.registration_attempt_count || 0) + 1;
        
        // Calculate backoff
        const interval = this.backoffIntervals[Math.min(newCount - 1, this.backoffIntervals.length - 1)];
        const nextRetry = new Date(Date.now() + interval * 60000);

        let finalStatus = 'failed';
        if (newCount >= 5) {
            finalStatus = 'failed'; // Permanent fail
            console.log(`❌ ${domain.domain_name} reached MAX RETRY`);
        } else {
            finalStatus = 'failed'; // We keep it 'failed' but with next_retry_at
            console.log(`⚠️ ${domain.domain_name} failed. Retry #${newCount} at ${nextRetry.toISOString()}`);
        }

        const sql = `
            UPDATE domains 
            SET status = $1, 
                registration_attempt_count = $2,
                next_retry_at = $3,
                registrar_error_log = $4,
                updated_at = NOW()
            WHERE id = $5
        `;
        await db.pool.query(sql, [finalStatus, newCount, nextRetry, errorData, domain.id]);
        await DomainLoggingService.log(domain.id, domain.status, finalStatus, `Registration Error: ${errorData.message || 'Unknown'}`, errorData);
    }

    normalizePhone(phone) {
        let p = phone.replace(/[^0-9]/g, "");
        if (p.startsWith("0")) p = "62" + p.slice(1);
        if (!p.startsWith("62")) p = "62" + p;
        return "+" + p.slice(0, 2) + "." + p.slice(2);
    }
}

module.exports = new DomainSyncWorker();
