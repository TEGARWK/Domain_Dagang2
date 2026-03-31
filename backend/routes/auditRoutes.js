const express = require("express");
const router = express.Router();
const auditController = require("../controllers/auditController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// Admin Only
router.get("/", verifyToken, verifyAdmin, auditController.getLogs);

module.exports = router;
