const axios = require("axios");
require("dotenv").config();

class DaftarnamaService {
    constructor() {
        // Log key presence for debugging (don't log the full key for security)
        const key = process.env.DAFTARNAMA_API_KEY;
        if (!key) {
            console.error("[DaftarnamaService] CRITICAL: DAFTARNAMA_API_KEY is missing in .env!");
        } else {
            console.log(`[DaftarnamaService] Initialized with API Key: ${key.substring(0, 5)}...`);
        }
        
        this.client = axios.create({
            baseURL: process.env.DAFTARNAMA_BASE_URL,
            headers: {
                "X-API-Key": key, 
                Accept: "application/json",
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
            const response = await this.client.get("/my/balance");
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
            const response = await this.client.get("/domain-availability", {
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
            const response = await this.client.get("/customer-tld-pricings");
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error getting pricings:", error.response?.data || error.message);
            throw error;
        }
    }

    async createCustomer(userData) {
        try {
            const response = await this.client.post("customers", userData);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error creating customer:", error.response?.data || error.message);
            throw error;
        }
    }

    async registerDomain(domainData) {


        try {
            const response = await this.client.post("domains", domainData);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error registering domain:", error.response?.data || error.message);
            throw error;
        }
    }

    async getDNSRecords(domainName) {
        try {
            const response = await this.client.get(`/domains/${domainName}/dns-records`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error getting DNS records:", error.response?.data || error.message);
            throw error;
        }
    }

    async addDNSRecord(domainName, recordData) {
        try {
            const response = await this.client.post(`/domains/${domainName}/dns-records`, recordData);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error adding DNS record:", error.response?.data || error.message);
            throw error;
        }
    }

    async deleteDNSRecord(domainName, recordId) {
        try {
            const response = await this.client.delete(`/domains/${domainName}/dns-records/${recordId}`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error deleting DNS record:", error.response?.data || error.message);
            throw error;
        }
    }

    async updateNameservers(domainName, nameservers) {
        try {
            // API expects array of strings
            const response = await this.client.put(`/domains/${domainName}/nameservers`, { nameservers });
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error updating nameservers:", error.response?.data || error.message);
            throw error;
        }
    }

    async setRegistrarLock(domainName, isLocked) {
        try {
            // User requested PUT /domains/{domain_name}/is_enable_transfer_protection
            const response = await this.client.put(`/domains/${domainName}/is_enable_transfer_protection`, { 
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
            const response = await this.client.get(`/domains/${domainName}`);
            return response.data;
        } catch (error) {
             console.error("[DaftarnamaService] Error getting domain info:", error.response?.data || error.message);
             // Return null if not found instead of throwing to allow sync to continue for others
            // Return null if not found instead of throwing to allow sync to continue for others
             if (error.response?.status === 404) return null;
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
            // POST /domains/transfer
            // Payload: { domain_name, epp_code, ...contactData }
            const payload = {
                domain_name: domainName,
                epp_code: eppCode,
                duration: 1, // Default duration
                ...contactData
            };
            


            const response = await this.client.post("/domain/transfer", payload); // URL changed to /domain/transfer based on screenshot
            return response.data; 
        } catch (error) {
             console.error("[DaftarnamaService] Error initiating transfer:", error.response?.data || error.message);
             throw error;
        }
    }

    async getTransferStatus(domainName) {
        try {
            // GET /domains/{domain_name}/transfer
            const response = await this.client.get(`/domains/${domainName}/transfer`);
            return response.data; // Expected: { status: "client_transfer_prohibited" | "pending" | "success" }
        } catch (error) {
             console.error("[DaftarnamaService] Error getting transfer status:", error.response?.data || error.message);
             // If 404, maybe no transfer in progress
             if (error.response?.status === 404) return null;
             throw error;
        }
    }

    async renewDomain(domainName, period = 1, currentExpiryDate) {
        try {
             // Daftarnama v2 requires duration instead of period
             const payload = { duration: period };
             if (currentExpiryDate) {
                 payload.current_expiry_date = currentExpiryDate;
             }
             const response = await this.client.post(`/domains/${domainName}/renew`, payload);
             return response.data;
        } catch (error) {
             console.error("[DaftarnamaService] Error renewing domain:", error.response?.data || error.message);
             throw error;
        }
    }

    async getDocumentUrl(domainName) {
        try {
            const response = await this.client.get(`/domains/${domainName}/upload_document_url`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error getting document upload URL:", error.response?.data || error.message);
            throw error;
        }
    }

    async restoreDomain(domainName) {
        try {


            const response = await this.client.post(`/domains/${domainName}/restore`);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Error restoring domain:", error.response?.data || error.message);
            throw error;
        }
    }

    async listDomains() {
        try {
            const response = await this.client.post("/domains", {});
            return response.data; // Usually { success: true, data: [...] }
        } catch (error) {
            console.error("[DaftarnamaService] Error listing domains:", error.response?.data || error.message);
            throw error;
        }
    }
}

module.exports = new DaftarnamaService();
