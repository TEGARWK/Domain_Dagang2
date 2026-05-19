const axios = require("axios");
const db = require("../config/db");
require("dotenv").config();

class DaftarnamaService {
    constructor() {
        this.config = null;
    }

    /**
     * Ambil konfigurasi terbaru dari database.
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
                apiKey: dbSettings.domain_api_key?.trim(),
                user: dbSettings.domain_api_user?.trim(),
                mode: dbSettings.domain_api_mode || "sandbox"
            };
        } catch (err) {
            console.error("[DaftarnamaService] Gagal ambil config dari DB:", err.message);
            return { baseURL: null, apiKey: null, user: null, mode: "sandbox" };
        }
    }

    /**
     * Helper untuk membuat axios client (Multi-header support)
     */
    async getClient() {
        try {
            const config = await this.getDynamicConfig();
            
            if (!config.apiKey || !config.baseURL) {
                throw new Error("API Configuration Missing (Key or URL)");
            }

            const headers = {
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-API-KEY": config.apiKey,       // Daftarnama V2
                "Auth-Token": config.apiKey,      // Reseller Panel
                "Authorization": `Bearer ${config.apiKey}` // OAuth Standard
            };

            if (config.user) {
                headers["X-API-USER"] = config.user;
            }

            return axios.create({
                baseURL: config.baseURL.endsWith('/') ? config.baseURL : config.baseURL + '/',
                headers: headers,
                timeout: 15000 
            });
        } catch (err) {
            console.error("[DaftarnamaService] ❌ getClient Error:", err.message);
            throw err;
        }
    }

    async getMyBalance() {
        try {
            const client = await this.getClient();
            const response = await client.get("my/balance");
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Balance Error:", error.response?.data || error.message);
            throw error;
        }
    }

    async checkAvailability(domain) {
        try {
            const client = await this.getClient();
            const response = await client.get("domain-availability", {
                params: { domain_name: domain }, 
            });
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Availability Error:", error.response?.data || error.message);
            throw error;
        }
    }

    async getDomainInfo(domainName) {
        try {
            const client = await this.getClient();
            const response = await client.get(`domains/${domainName}`);
            return response.data;
        } catch (error) {
            if (error.response?.status === 404) return null;
            console.error(`[DaftarnamaService] Info Error (${domainName}):`, error.response?.data || error.message);
            throw error;
        }
    }

    async registerDomain(domainData) {
        try {
            const client = await this.getClient();
            const response = await client.post("domains", domainData);
            return response.data;
        } catch (error) {
            console.error("[DaftarnamaService] Register Error:", error.response?.data || error.message);
            throw error;
        }
    }

    async renewDomain(domainName, period = 1) {
        try {
             const client = await this.getClient();
             const response = await client.post(`domains/${domainName}/renew`, { duration: period });
             return response.data;
        } catch (error) {
             console.error("[DaftarnamaService] Renew Error:", error.response?.data || error.message);
             throw error;
        }
    }
}

module.exports = new DaftarnamaService();
