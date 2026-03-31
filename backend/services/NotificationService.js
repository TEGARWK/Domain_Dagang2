const db = require("../config/db");

class NotificationService {
    /**
     * Create a notification for a specific user
     * @param {number} userId - ID of the user
     * @param {string} title - Short descriptive title
     * @param {string} message - Detailed notification message
     * @param {string} type - success, info, warning, error, system, promo
     * @param {string} referenceId - (Optional) ID for deep linking/dedup
     * @param {string} referenceType - (Optional) Type for deep linking/dedup (e.g. 'invoice', 'domain')
     */
    async createNotification(userId, title, message, type = 'system', referenceId = null, referenceType = null) {
        try {
            const query = `
                INSERT INTO notifications (user_id, title, message, type, reference_id, reference_type)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (user_id, title, reference_id, reference_type) DO NOTHING
                RETURNING *;
            `;
            const result = await db.pool.query(query, [userId, title, message, type, referenceId, referenceType]);
            
            if (result.rows.length > 0) {
                console.log(`[Notification] Created for User ${userId}: ${title}`);
                return result.rows[0];
            } else {
                console.log(`[Notification] Skipped (Duplicate): ${title} for User ${userId}`);
                return null;
            }
        } catch (err) {
            console.error("[NotificationService] Error creating notification:", err);
            return null;
        }
    }

    /**
     * Create notifications for multiple users
     */
    async createBulkNotification(userIds, title, message, type = 'system', referenceId = null, referenceType = null) {
        const results = [];
        for (const userId of userIds) {
            const notif = await this.createNotification(userId, title, message, type, referenceId, referenceType);
            if (notif) results.push(notif);
        }
        return results;
    }

    /**
     * Send notification to all users
     */
    async createGlobalNotification(title, message, type = 'system') {
        try {
            const users = await db.pool.query("SELECT id FROM users");
            const userIds = users.rows.map(u => u.id);
            return await this.createBulkNotification(userIds, title, message, type);
        } catch (err) {
            console.error("[NotificationService] Global notification error:", err);
            return [];
        }
    }

    /**
     * Send notification to all admins
     */
    async createAdminNotification(title, message, type = 'system', referenceId = null, referenceType = null) {
        try {
            const users = await db.pool.query("SELECT id FROM users WHERE role = 'admin'");
            const adminIds = users.rows.map(u => u.id);
            return await this.createBulkNotification(adminIds, title, message, type, referenceId, referenceType);
        } catch (err) {
            console.error("[NotificationService] Admin notification error:", err);
            return [];
        }
    }

    /**
     * Mark a specific notification as read
     */
    async markAsRead(notificationId, userId) {
        try {
            const query = "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2";
            await db.pool.query(query, [notificationId, userId]);
            return true;
        } catch (err) {
            console.error("[NotificationService] Error marking as read:", err);
            return false;
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        try {
            const query = "UPDATE notifications SET is_read = TRUE WHERE user_id = $1";
            await db.pool.query(query, [userId]);
            return true;
        } catch (err) {
            console.error("[NotificationService] Error marking all as read:", err);
            return false;
        }
    }

    /**
     * Cleanup old notifications
     * Keep max 500 per user OR delete older than 90 days
     */
    async cleanup() {
        try {
            console.log("🧹 Starting Notification Cleanup...");
            
            // 1. Delete older than 90 days
            const deleteOld = "DELETE FROM notifications WHERE created_at < NOW() - INTERVAL '90 days'";
            const oldRes = await db.pool.query(deleteOld);
            console.log(`✅ Deleted ${oldRes.rowCount} notifications older than 90 days.`);

            // 2. Keep max 500 latest per user
            const deleteOverLimit = `
                DELETE FROM notifications 
                WHERE id IN (
                    SELECT id FROM (
                        SELECT id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rank
                        FROM notifications
                    ) t WHERE t.rank > 500
                )
            `;
            const limitRes = await db.pool.query(deleteOverLimit);
            console.log(`✅ Deleted ${limitRes.rowCount} notifications exceeding 500 limit per user.`);
            
            return true;
        } catch (err) {
            console.error("[NotificationService] Cleanup error:", err);
            return false;
        }
    }
}

module.exports = new NotificationService();
