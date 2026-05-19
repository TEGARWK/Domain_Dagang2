const express = require("express");
const router = express.Router();
const controller = require("../controllers/domainController");
const dnsController = require("../controllers/dnsController");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

// Public / User Routes
router.get("/check", controller.checkDomainAvailability);
router.get("/check-availability", controller.checkDomainAvailability); // Alias untuk kompatibilitas frontend
router.get("/user/:userId", verifyToken, controller.getUserDomains);
router.get("/detail/:id", verifyToken, controller.getDomainDetail);
router.put("/detail/:id", verifyToken, controller.updateDomain);
router.post("/:id/sync", verifyToken, controller.syncDomain); // NEW
router.post("/:id/renew", verifyToken, controller.renewDomain); // NEW
router.put("/:id/lock", verifyToken, controller.updateRegistrarLock); // NEW
router.get("/:id/epp", verifyToken, controller.getEPPCode); // NEW
router.get("/:id/document-url", verifyToken, controller.getUploadDocumentUrl); // NEW
router.post("/resync", verifyToken, controller.resyncUserDomains); // NEW
router.post("/resync/:userId", verifyAdmin, controller.resyncUserDomains); // NEW

// Admin Routes
router.get("/all", verifyAdmin, controller.getAllDomains); // LIST ALL DOMAINS
router.get("/:id/audit-logs", verifyAdmin, controller.getDomainAuditLogs);
router.post("/:id/retry-registration", verifyAdmin, controller.retryRegistration);
router.put("/:id/admin", verifyAdmin, controller.adminUpdateDomain); // Status Override
router.delete("/:id", verifyAdmin, controller.deleteDomain); // Delete Domain

// DNS Records Routes
router.get("/:id/dns", verifyToken, dnsController.getRecords);
router.post("/:id/dns", verifyToken, dnsController.createRecord);
router.put("/:id/dns/:recordId", verifyToken, dnsController.updateRecord);
router.delete("/:id/dns/:recordId", verifyToken, dnsController.deleteRecord);

module.exports = router;
