const db = require("../config/db");

// 1. GET ALL NOTIFICATIONS
exports.getNotifications = (req, res) => {
    const userId = req.user.id;
    const query = "SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC";
    
    db.pool.query(query, [userId], (err, results) => {
        if (err) {
            console.error("❌ SQL Error in getNotifications:", err.message);
            return res.status(500).json({ error: "Gagal mengambil notifikasi" });
        }
        res.json(results ? results.rows || [] : []);
    });
};

// 2. MARK AS READ
exports.markAsRead = (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const query = "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2";
    
    db.pool.query(query, [id, userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Notification marked as read" });
    });
};

// 3. MARK ALL AS READ
exports.markAllAsRead = (req, res) => {
    const userId = req.user.id;
    const query = "UPDATE notifications SET is_read = TRUE WHERE user_id = $1";
    
    db.pool.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "All notifications marked as read" });
    });
};

// 4. DELETE NOTIFICATION
exports.deleteNotification = (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const query = "DELETE FROM notifications WHERE id = $1 AND user_id = $2";
    
    db.pool.query(query, [id, userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Notification deleted" });
    });
};
