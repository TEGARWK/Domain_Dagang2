const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentGatewayController");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

// Public (for Checkout page)
router.get("/", controller.getAll);
router.get("/calculate-fee", controller.calculateFee);

// Admin (for Management page)
router.get("/admin", verifyAdmin, controller.getAllAdmin);
router.get("/admin/tripay-balance", verifyAdmin, controller.getTripayBalance);
router.get("/admin/tripay-channels", verifyAdmin, controller.getTripayChannels);
router.get("/tripay-channels", controller.getTripayChannels); // Alias for frontend

// Prismalink Channels
router.get("/prismalink/channels", verifyAdmin, controller.getPrismalinkChannels);
router.post("/prismalink/channels", verifyAdmin, controller.createPrismalinkChannel);
router.patch("/prismalink/channels/:bankId/toggle", verifyAdmin, controller.togglePrismalinkChannel);
router.put("/prismalink/channels/:bankId", verifyAdmin, controller.updatePrismalinkChannel);
router.delete("/prismalink/channels/:bankId", verifyAdmin, controller.deletePrismalinkChannel);

router.put("/:provider", controller.update); // Still used for tripay

// Manual CRUD
router.post("/manual", controller.createManual);
router.put("/manual/:id", controller.updateManual);
router.delete("/manual/:id", controller.deleteManual);

module.exports = router;
