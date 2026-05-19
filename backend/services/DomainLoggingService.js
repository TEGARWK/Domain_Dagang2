const db = require("../config/db");

class DomainLoggingService {
    /**
     * Log a domain status transition or important event.
     * @param {number} domainId Internal domain ID
     * @param {string} fromStatus Previous status
     * @param {string} toStatus New status
     * @param {string} reason Reason for change (e.g. "Payment confirmed", "Registrar Timeout")
     * @param {object} apiRaw Optional raw API response for debugging
     * @param {string} domainName Optional domain name to lookup ID
     * @param {object} meta Optional metadata (performed_by, event_type, old_value, new_value)
     */
    async log(domainId, fromStatus, toStatus, reason, apiRaw = null, domainName = null, meta = {}) {
        let logId = domainId; // Rename to avoid any potential shadowing/confusion

        try {
            // Resolve domainId if only name is provided
            if (!logId && domainName) {
                const [rows] = await db.promise().query("SELECT id FROM domains WHERE domain_name = ?", [domainName]);
                if (rows.length > 0) logId = rows[0].id;
            }

            if (!logId) {
                console.warn("[DomainLoggingService] Cannot log event: Domain ID not found for", domainName || domainId);
                return;
            }

            // Attempt advanced logging (includes Phase M hardening columns)
            const sql = `
                INSERT INTO domain_event_logs (
                    domain_id, from_status, to_status, reason, 
                    api_raw_response, event_type, old_value, new_value, performed_by
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            const params = [
                logId,
                fromStatus || 'N/A',
                toStatus || 'N/A',
                reason,
                apiRaw ? JSON.stringify(apiRaw) : null,
                meta.event_type || 'STATUS_CHANGE',
                (meta.old_value !== undefined && meta.old_value !== null) ? JSON.stringify(meta.old_value) : null,
                (meta.new_value !== undefined && meta.new_value !== null) ? JSON.stringify(meta.new_value) : null,
                meta.performed_by || null
            ];

            await db.promise().query(sql, params);

        } catch (err) {
            console.error("[DomainLoggingService] Critical: Failed to save audit log:", err.message);
            
            // FALLBACK: Only if column doesn't exist (schema not yet migrated)
            if (err.message.includes("column") || err.message.includes("does not exist")) {
                try {
                    console.log("[DomainLoggingService] Falling back to legacy log structure...");
                    const fallbackSql = `
                        INSERT INTO domain_event_logs (domain_id, from_status, to_status, reason, api_raw_response)
                        VALUES (?, ?, ?, ?, ?)
                    `;
                    // Ensure logId is still valid in this scope
                    if (logId) {
                        await db.promise().query(fallbackSql, [logId, fromStatus, toStatus, reason, apiRaw ? JSON.stringify(apiRaw) : null]);
                    }
                } catch (fallbackErr) {
                    console.error("[DomainLoggingService] Fallback also failed:", fallbackErr.message);
                }
            }
        }
    }

    /**
     * Shorthand for simple event logging without status change
     */
    async logChange(domainId, eventType, reason, meta = {}) {
        return this.log(domainId, null, null, reason, null, null, { ...meta, event_type: eventType });
    }
}

module.exports = new DomainLoggingService();
