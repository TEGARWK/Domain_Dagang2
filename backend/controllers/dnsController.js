const db = require("../config/db");
const DaftarnamaService = require("../services/DaftarnamaService");

// --- GET DNS RECORDS ---
exports.getRecords = (req, res) => {
    const domainId = req.params.id;
    const userId = req.user.id;

    // 1. Verify Ownership & Get Domain Name
    let checkSql = "SELECT id, domain_name FROM domains WHERE id = $1";
    const params = [domainId];

    if (req.user.role !== 'admin') {
        checkSql += " AND user_id = $2";
        params.push(userId);
    }

    db.pool.query(checkSql, params, async (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.rows.length === 0) return res.status(403).json("Unauthorized or Domain not found");

        const domainName = result.rows[0].domain_name;

        try {
            // 2. Fetch Records from Daftarnama (Real-time)
            const response = await DaftarnamaService.getDNSRecords(domainName);
            
            // Flexible extraction: handle if response is directly the array or wrapped in .data
            const records = Array.isArray(response) ? response : (response?.data || []); 

            res.json(records);
        } catch (error) {
            const status = error.response?.status || 500;
            const errorData = error.response?.data;
            
            // Handle 404 (Domain not found at registrar) gracefully
            if (status === 404) {
                return res.status(200).json([]);
            }

            // [FIX] Handle 500/502/503 from Registrar DNS API gracefully. 
            // Often occurs if DNS Zone is not yet initialized. Returning empty list allows user to ADD record.
            if (status >= 500) {
                console.warn(`[DNSController] Registrar DNS Zone might not be initialized for ${domainName} (Status ${status})`);
                return res.status(200).json([]);
            }

            console.error(`[DNSController] Registrar GET Error (${status}):`, JSON.stringify(errorData || error.message, null, 2));
            
            res.status(status === 500 ? 502 : status).json({ 
                message: "Registrar DNS API bermasalah (Status: " + status + ")",
                error: errorData?.message || error.message,
                records: [] 
            });
        }
    });
};

// --- ADD DNS RECORD ---
exports.createRecord = (req, res) => {
    const domainId = req.params.id;
    const userId = req.user.id;
    const { type, name, value, ttl, priority } = req.body;

    if (!type || !name || !value) {
        return res.status(400).json("Type, Name, and Value are required");
    }

    let checkSql = "SELECT id, domain_name FROM domains WHERE id = $1";
    const params = [domainId];

    if (req.user.role !== 'admin') {
        checkSql += " AND user_id = $2";
        params.push(userId);
    }

    db.pool.query(checkSql, params, async (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.rows.length === 0) return res.status(403).json("Unauthorized or Domain not found");

        const domainName = result.rows[0].domain_name;

        try {
            // V2 Payload Mapping
            // FIX: Ensure sub_domain is clean (some frontends might send @domain.com)
            let finalSubDomain = name;
            if (finalSubDomain.includes('@')) {
                finalSubDomain = '@'; // Force to just @ if it contains @
            }

            const payload = {
                sub_domain: finalSubDomain,
                type: type,
                ttl: parseInt(ttl) || 3600
            };

            // Dynamic field mapping based on actual registrar requirements
            const typeUpper = type.toUpperCase();
            if (typeUpper === 'A' || typeUpper === 'AAAA') {
                payload.address = value;
            } else if (typeUpper === 'CNAME') {
                // FIX: Use 'cname' instead of 'address' as required by registrar validation
                payload.cname = value;
            } else if (typeUpper === 'MX') {
                payload.exchange = value;
                payload.preference = parseInt(priority) || 10;
            } else if (typeUpper === 'TXT') {
                payload.txt_data = value;
            } else if (typeUpper === 'NS') {
                payload.ns = value;
            } else if (typeUpper === 'SRV') {
                payload.target = value;
                payload.priority = parseInt(req.body.priority) || 10;
                payload.weight = parseInt(req.body.weight) || 5;
                payload.port = parseInt(req.body.port) || 80;
            }

            console.log(`[DNSController] Adding DNS Record for ${domainName}:`, JSON.stringify(payload, null, 2));

            // 1. Sync to Daftarnama
            const apiRes = await DaftarnamaService.addDNSRecord(domainName, payload);

            if (apiRes && (apiRes.success || apiRes.code === 201 || apiRes.code === 200)) {
                res.status(201).json({ success: true, message: "DNS Record created successfully" });
            } else {
                console.error("[DNSController] Registrar Add DNS Failed:", apiRes);
                res.status(400).json({ success: false, message: apiRes?.message || "Gagal di sisi registrar. Cek kembali format isian (Host/Value)." });
            }
        } catch (error) {
            const status = error.response?.status || 500;
            const errorData = error.response?.data;
            console.error(`[DNSController] Create Error Details (${status}):`, JSON.stringify(errorData || error.message, null, 2));
            
            let userMessage = "Gagal menambah record DNS di sisi registrar.";
            if (status === 500 || status === 502) {
                userMessage = "Registrar DNS API sedang tidak menanggapi (Server Error). Silakan coba lagi dalam beberapa menit atau hubungi support.";
            } else if (errorData?.message) {
                userMessage = errorData.message;
            }

            res.status(status === 500 ? 502 : status).json({ 
                message: userMessage, 
                error: (errorData?.message || errorData?.error || error.message) 
            });
        }
    });
};

// --- DELETE DNS RECORD ---
exports.deleteRecord = (req, res) => {
    const domainId = req.params.id;
    const recordId = req.params.recordId;
    const userId = req.user.id;

    let checkSql = "SELECT id, domain_name FROM domains WHERE id = $1";
    const params = [domainId];

    if (req.user.role !== 'admin') {
        checkSql += " AND user_id = $2";
        params.push(userId);
    }

    db.pool.query(checkSql, params, async (err, result) => {
        if (err) return res.status(500).json(err);
        if (result.rows.length === 0) return res.status(403).json("Unauthorized or Domain not found");

        const domainName = result.rows[0].domain_name;

        try {
            const apiRes = await DaftarnamaService.deleteDNSRecord(domainName, recordId);
            
            if (apiRes && (apiRes.success || apiRes.code === 200)) {
                res.json({ success: true, message: "DNS Record deleted successfully" });
            } else {
                res.status(400).json({ success: false, message: apiRes?.message || "Gagal menghapus di registrar" });
            }
        } catch (error) {
            console.error("[DNSController] Delete Error:", error.response?.data || error.message);
            res.status(500).json({ 
                message: "Gagal hapus DNS di registrar", 
                error: error.response?.data?.message || error.message 
            });
        }
    });
};

// Update: No direct update endpoint requested in Daftarnama V2 Swagger for DNS, 
// usually it's Delete -> Add. We keep the handler but might not use it or implement via delete+add.
exports.updateRecord = (req, res) => {
    res.status(501).json("Update DNS not implemented in Daftarnama V2 Proxy (Use Delete & Add)");
};
