const express = require("express");
const router = express.Router();
const controller = require("../controllers/adminController");
const { verifyAdmin } = require("../middleware/authMiddleware");
const { verifyAdminView } = require("../middleware/adminViewAuth");

router.get("/dashboard", verifyAdminView, controller.renderDashboard);
router.get("/transactions", verifyAdminView, controller.renderTransactions);
router.get("/users", verifyAdminView, controller.renderUsers);



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

// --- DOMAINS ---
const domainController = require("../controllers/domainController");
router.post("/domains/sync-manual", verifyAdmin, domainController.syncManualRegistrarDomains);

// --- VOUCHERS (ADMIN) ---
const adminVoucherController = require("../controllers/adminVoucherController");
router.get("/vouchers", verifyAdminView, adminVoucherController.renderVouchers);
router.get("/vouchers/create", verifyAdminView, adminVoucherController.renderCreateVoucher);
router.get("/vouchers/:id/claims", verifyAdminView, adminVoucherController.renderVoucherClaims);

router.post("/vouchers/create", verifyAdmin, adminVoucherController.createVoucher);
router.put("/vouchers/:id", verifyAdmin, adminVoucherController.updateVoucher);
router.get("/vouchers/list", verifyAdmin, adminVoucherController.listVouchers);
router.patch("/vouchers/:id/toggle", verifyAdmin, adminVoucherController.toggleVoucher);
router.get("/vouchers/:id/claims", verifyAdmin, adminVoucherController.getVoucherClaims);

// --- REFERRAL (ADMIN API) ---
const adminReferralController = require("../controllers/adminReferralController");

// API Routes must come FIRST to avoid collision with view routes sharing the same path
router.get("/referral/stats", verifyAdmin, adminReferralController.getGlobalStats);
router.get("/referral/merchants", verifyAdmin, adminReferralController.getReferralMerchants);

router.get("/referral/tiers", verifyAdmin, adminReferralController.getTiers);
router.post("/referral/tiers", verifyAdmin, adminReferralController.createTier);
router.patch("/referral/tiers/:id", verifyAdmin, adminReferralController.updateTier);
router.delete("/referral/tiers/:id", verifyAdmin, adminReferralController.deleteTier);

router.get("/referral/config", verifyAdmin, adminReferralController.getGlobalConfig);
router.patch("/referral/config", verifyAdmin, adminReferralController.updateGlobalConfig);

router.get("/referral/rewards", verifyAdmin, adminReferralController.getAllRewards);
router.post("/referral/rewards/:id/cancel", verifyAdmin, adminReferralController.cancelReward);

router.get("/referral/banned-words", verifyAdmin, adminReferralController.getBannedWords);
router.post("/referral/banned-words", verifyAdmin, adminReferralController.updateBannedWords);

// --- REFERRAL (ADMIN VIEWS - EJS) ---
// These use Cookie-based auth (verifyAdminView)
router.get("/referral", verifyAdminView, adminReferralController.renderReferralStats);
router.get("/referral/rewards", verifyAdminView, adminReferralController.renderReferralRewards);
router.get("/referral/tiers", verifyAdminView, adminReferralController.renderReferralTiers);



module.exports = router;
