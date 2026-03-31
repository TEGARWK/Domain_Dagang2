const express = require("express");
const router = express.Router();
const controller = require("../controllers/transferController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Public Routes
router.post("/check", controller.checkTransfer);

// User Routes
router.post("/", verifyToken, controller.submitTransfer);
router.get("/my", verifyToken, controller.getMyTransfers);

// Admin Routes
router.get("/admin/all", verifyToken, verifyAdmin, controller.getAllTransfers);
router.put("/admin/:id", verifyToken, verifyAdmin, controller.updateTransferStatus);

module.exports = router;
