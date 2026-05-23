const axios = require("axios");
const db = require("../config/db");
require("dotenv").config();

class DaftarnamaService {
    constructor() {
        this.config = null;
    }

    /**
     * Ambil konfigurasi terbaru dari database.
     * Jika di database kosong, gunakan .env sebagai fallback.
     */
    async getDynamicConfig() {
        try {
            const query = "SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'domain_api_%'";
            const results = await db.pool.query(query);
            
            const dbSettings = {};
            results.rows.forEach(row => {
                dbSettings[row.setting_key] = row.setting_value;
            });

            return {
                baseURL: dbSettings.domain_api_url,
                apiKey: dbSettings.domain_api_key,
                user: dbSettings.domain_api_user,
                mode: dbSettings.domain_api_mode || "sandbox"
            };
        } catch (err) {
            console.error("[DaftarnamaService] Gagal ambil config dari DB:", err.message);
            return {
                baseURL: null,
                apiKey: null,
                user: null,
                mode: "sandbox"
            };
        }
    }

    /**
     * Helper untuk membuat axios client dengan config terbaru
     */
    async getClient() {
        const config = await this.getDynamicConfig();
        
        if (!config.apiKey) {
            console.error("[DaftarnamaService] CRITICAL: API Key tidak ditemukan!");
        }

        return axios.create({
            baseURL: config.baseURL,
            headers: {
                "X-API-Key": config.apiKey,
                "Accept": "application/json",
                "Content-Type": "application/json",
            },
        });
    }

    async getPublicIP() {
        try {
            const res = await axios.get("https://api.ipify.org?format=json");
            return res.data.ip;
        } catch (e) {
            return "Unknown IP";
        }
    }

    async getMyBalance() {
        try {
            const client = await this.getClient();
            const response = await client.get("/my/balance");
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error getting balance:", error.response?.data || error.message);
            if (error.response) {
                console.error("[DaftarnamaService] Response Status:", error.response.status);
                console.error("[DaftarnamaService] Response Data:", JSON.stringify(error.response.data, null, 2));
            }
            throw error;
        }
    }

    async checkAvailability(domain) {
        try {
            const client = await this.getClient();
            const response = await client.get("/domain-availability", {
                params: { domain_name: domain }, 
            });
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error checking availability:", error.response?.data || error.message);
            throw error;
        }
    }

    async getTLDPricings() {
        try {
            const client = await this.getClient();
            const response = await client.get("/customer-tld-pricings");
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error getting pricings:", error.response?.data || error.message);
            throw error;
        }
    }

    async createCustomer(userData) {
        try {
            const client = await this.getClient();
            const response = await client.post("customers", userData);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error creating customer:", error.response?.data || error.message);
            throw error;
        }
    }

    async registerDomain(domainData) {
        try {
            const client = await this.getClient();
            const response = await client.post("domains", domainData);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error registering domain:", error.response?.data || error.message);
            throw error;
        }
    }

    async getDNSRecords(domainName) {
        try {
            const client = await this.getClient();
            const response = await client.get(`/domains/${domainName}/dns-records`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error getting DNS records:", error.response?.data || error.message);
            throw error;
        }
    }

    async addDNSRecord(domainName, recordData) {
        try {
            const client = await this.getClient();
            const response = await client.post(`/domains/${domainName}/dns-records`, recordData);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error adding DNS record:", error.response?.data || error.message);
            throw error;
        }
    }

    async deleteDNSRecord(domainName, recordId) {
        try {
            const client = await this.getClient();
            const response = await client.delete(`/domains/${domainName}/dns-records/${recordId}`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error deleting DNS record:", error.response?.data || error.message);
            throw error;
        }
    }

    async updateNameservers(domainName, nameservers) {
        try {
            const client = await this.getClient();
            const response = await client.put(`/domains/${domainName}/nameservers`, { nameservers });
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error updating nameservers:", error.response?.data || error.message);
            throw error;
        }
    }

    async setRegistrarLock(domainName, isLocked) {
        try {
            const client = await this.getClient();
            const response = await client.put(`/domains/${domainName}/is_enable_transfer_protection`, { 
                is_enable_transfer_protection: isLocked 
            });
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error setting registrar lock:", error.response?.data || error.message);
            throw error;
        }
    }

    async getDomainInfo(domainName) {
        try {
            const client = await this.getClient();
            const response = await client.get(`/domains/${domainName}`);
            return response.data;
        } catch (error) {
             // Suppress noise for 404 (Not Found) during background sync
             if (error.response?.status === 404) return null;
             
             console.error("[DaftarnamaService] Error getting domain info:", error.response?.data || error.message);
             throw error;
        }
    }

    // --- Transfer Domain Methods ---

    async checkTransferEligibility(domainName) {
        try {
            // Simulated eligibility check for now as requested in plan
            // In real scenario: GET /domain/transfer-eligibility?domain_name=...
            
            // Check TLD support
            const supportedTLDs = ['.com', '.net', '.org', '.id', '.co.id', '.biz.id', '.my.id', '.web.id'];
            const isSupported = supportedTLDs.some(tld => domainName.endsWith(tld));
            
            if (!isSupported) {
                return { eligible: false, reason: "TLD not supported for transfer." };
            }

            // Real API call if available:
            // const response = await this.client.get(`/domains/${domainName}/transfer/eligibility`);
            // return response.data;

            return { eligible: true };
        } catch (error) {
             console.error("[DaftarnamaService] Error checking transfer eligibility:", error.response?.data || error.message);
             return { eligible: false, reason: "Unable to verify eligibility at this time." };
        }
    }

    async initiateTransfer(domainName, eppCode, contactData = {}) {
        try {
            const client = await this.getClient();
            const payload = {
                domain_name: domainName,
                epp_code: eppCode,
                duration: 1,
                ...contactData
            };
            const response = await client.post("/domain/transfer", payload);
            return response.data; 
        } catch (error) {
             console.error("[DaftarnamaService] Error initiating transfer:", error.response?.data || error.message);
             throw error;
        }
    }

    async getTransferStatus(domainName) {
        try {
            const client = await this.getClient();
            const response = await client.get(`/domains/${domainName}/transfer`);
            return response.data;
        } catch (error) {
             console.error("[DaftarnamaService] Error getting transfer status:", error.response?.data || error.message);
             if (error.response?.status === 404) return null;
             throw error;
        }
    }

    async renewDomain(domainName, period = 1, currentExpiryDate) {
        try {
             const client = await this.getClient();
             const payload = { duration: period };
             if (currentExpiryDate) {
                 payload.current_expiry_date = currentExpiryDate;
             }
             const response = await client.post(`/domains/${domainName}/renew`, payload);
             return response.data;
        } catch (error) {
             console.error("[DaftarnamaService] Error renewing domain:", error.response?.data || error.message);
             throw error;
        }
    }

    async getDocumentUrl(domainName) {
        try {
            const client = await this.getClient();
            const response = await client.get(`/domains/${domainName}/upload_document_url`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error getting document upload URL:", error.response?.data || error.message);
            throw error;
        }
    }

    async restoreDomain(domainName) {
        try {
            const client = await this.getClient();
            const response = await client.post(`/domains/${domainName}/restore`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error restoring domain:", error.response?.data || error.message);
            throw error;
        }
    }

    async listDomains() {
        try {
            const client = await this.getClient();
            const response = await client.post("/domains", {});
            return response.data; // Usually { success: true, data: [...] }
        } catch (error) {
            console.error("[DaftarnamaService] Error listing domains:", error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new DaftarnamaService();
