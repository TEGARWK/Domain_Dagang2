const express = require("express");
const router = express.Router();
const controller = require("../controllers/notificationController");
const { verifyToken } = require("../middleware/authMiddleware");

// All routes require authentication
router.use(verifyToken);

router.get("/", controller.getNotifications);
router.put("/read-all", controller.markAllAsRead);
router.put("/:id/read", controller.markAsRead);
router.delete("/:id", controller.deleteNotification);

module.exports = router;
