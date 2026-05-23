const NotificationService = require("../services/NotificationService");

exports.sendNotification = async (req, res) => {
    try {
        const { type, user_id, title, message, notification_type } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: "Title and message are required." });
        }

        let sentNotifs = [];

        if (type === "global") {
            sentNotifs = await NotificationService.createGlobalNotification(
                title, 
                message, 
                notification_type || "system"
            );
            return res.json({ 
                success: true, 
                message: `Berhasil mengirim notifikasi global ke ${sentNotifs.length} user.` 
            });
        } else if (type === "user") {
            if (!user_id) {
                return res.status(400).json({ message: "User ID is required for targeted notification." });
            }
            const notif = await NotificationService.createNotification(
                user_id, 
                title, 
                message, 
                notification_type || "info"
            );
            return res.json({ 
                success: true, 
                message: notif ? "Notifikasi berhasil dikirim." : "Gagal mengirim notifikasi (mungkin duplikat)." 
            });
        } else {
            return res.status(400).json({ message: "Invalid type. Must be 'global' or 'user'." });
        }

    } catch (err) {
        console.error("[AdminNotificationController] Error:", err);
        res.status(500).json({ message: "Gagal mengirim notifikasi." });
    }
};
