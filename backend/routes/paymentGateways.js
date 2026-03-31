const express = require("express");
const router = express.Router();
const controller = require("../controllers/paymentGatewayController");

// Public (for Checkout page)
router.get("/", controller.getAll);

// Admin (for Management page)
router.get("/admin", controller.getAllAdmin);
router.post("/", controller.create);
router.put("/:provider", controller.update); // Changed from :id to :provider
router.delete("/:id", controller.delete);

module.exports = router;
