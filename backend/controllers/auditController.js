const db = require("../config/db");

/**
 * 
 * Helper function to create audit logs
 * Can be imported and used in other controllers
 */
const createLog = async ({ user_id, action, entity_type, entity_id, old_value, new_value, req }) => {
    try {
        const ip_address = req?.ip || req?.headers['x-forwarded-for'] || '127.0.0.1';
        const user_agent = req?.headers['user-agent'] || 'System';

        await db.query(
            `INSERT INTO audit_logs 
            (user_id, action, entity_type, entity_id, old_value, new_value, ip_address, user_agent) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                user_id || null, 
                action, 
                entity_type || null, 
                entity_id || null, 
                old_value ? JSON.stringify(old_value) : null, 
                new_value ? JSON.stringify(new_value) : null, 
                ip_address, 
                user_agent
            ]
        );
    } catch (err) {
        console.error("🔥 Failed to create audit log:", err.message);
    }
};

/**
 * Admin: Get All Audit Logs with Filtering
 */
const getLogs = async (req, res) => {
    try {
        const { entity_type, action, limit = 100 } = req.query;
        let query = `
            SELECT al.*, u.name as user_name, u.email as user_email 
            FROM audit_logs al 
            LEFT JOIN users u ON al.user_id = u.id 
            WHERE 1=1
        `;
        const params = [];

        if (entity_type) {
            params.push(entity_type);
            query += ` AND al.entity_type = $${params.length}`;
        }

        if (action) {
            params.push(action);
            query += ` AND al.action = $${params.length}`;
        }

        query += ` ORDER BY al.created_at DESC LIMIT $${params.length + 1}`;
        params.push(limit);

        const result = await db.query(query, params);
        res.json(result);
    } catch (err) {
        console.error("Fetch audit logs error:", err);
        res.status(500).json({ error: "Gagal mengambil log aktivitas" });
    }
};

module.exports = { createLog, getLogs };
