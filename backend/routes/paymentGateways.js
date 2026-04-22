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
router.put("/:provider", controller.update);
router.delete("/:id", controller.delete);

module.exports = router;
