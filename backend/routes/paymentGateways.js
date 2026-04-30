const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentGatewayController");

// Public (for Checkout page)
router.get("/", controller.getAll);
router.get("/calculate-fee", controller.calculateFee);

// Admin (for Management page)
router.get("/admin", controller.getAllAdmin);
router.get("/admin/tripay-balance", controller.getTripayBalance);
router.get("/admin/tripay-channels", controller.getTripayChannels);
router.get("/tripay-channels", controller.getTripayChannels); // Alias for frontend
router.put("/:provider", controller.update); // Still used for tripay

// Manual CRUD
router.post("/manual", controller.createManual);
router.put("/manual/:id", controller.updateManual);
router.delete("/manual/:id", controller.deleteManual);

module.exports = router;
