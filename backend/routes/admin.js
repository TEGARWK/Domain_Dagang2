const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/adminMiddleware");

const adminNotificationController = require("../controllers/adminNotificationController");
const registrarBalanceController = require("../controllers/registrarBalanceController");
const auditController = require("../controllers/auditController");

router.get("/stats", verifyAdmin, controller.getDashboardStats);
router.post("/notifications/send", verifyAdmin, adminNotificationController.sendNotification);

// --- REGISTRAR BALANCE ---
router.get("/registrar-balance", verifyAdmin, registrarBalanceController.getDetails);
router.post("/registrar-balance/sync", verifyAdmin, registrarBalanceController.sync);
router.post("/registrar-balance/topup", verifyAdmin, registrarBalanceController.manualTopup);

// --- WITHDRAWALS ---
const withdrawalController = require("../controllers/withdrawalController");
router.get("/withdrawals", verifyAdmin, withdrawalController.getAllRequests);
router.post("/withdrawals/:id/approve", verifyAdmin, withdrawalController.approveRequest);
router.post("/withdrawals/:id/reject", verifyAdmin, withdrawalController.rejectRequest);
router.post("/withdrawals/:id/complete", verifyAdmin, withdrawalController.completeRequest);

// --- AUDIT LOGS ---
router.get("/logs", verifyAdmin, auditController.getLogs);

module.exports = router;
