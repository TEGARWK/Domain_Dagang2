const db = require("../config/db");

// 1. GET ALL NOTIFICATIONS
exports.getNotifications = (req, res) => {
    const userId = req.user.id;
    const query = "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC";
    
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
};

// 2. MARK AS READ
exports.markAsRead = (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const query = "UPDATE notifications SET is_read = TRUE WHERE id = ? AND user_id = ?";
    
    db.query(query, [id, userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Notification marked as read" });
    });
};

// 3. MARK ALL AS READ
exports.markAllAsRead = (req, res) => {
    const userId = req.user.id;
    const query = "UPDATE notifications SET is_read = TRUE WHERE user_id = ?";
    
    db.query(query, [userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "All notifications marked as read" });
    });
};

// 4. DELETE NOTIFICATION
exports.deleteNotification = (req, res) => {
    const userId = req.user.id;
    const { id } = req.params;
    const query = "DELETE FROM notifications WHERE id = ? AND user_id = ?";
    
    db.query(query, [id, userId], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json({ message: "Notification deleted" });
    });
};
