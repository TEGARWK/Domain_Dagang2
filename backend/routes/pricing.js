const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricingController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/all", pricingController.getAllPricing);
router.post("/sync", verifyAdmin, pricingController.syncPricing); // NEW SYNC ROUTE
router.post("/add", verifyAdmin, pricingController.addPricing);
router.put("/:id", verifyAdmin, pricingController.updatePricing);
router.delete("/:id", verifyAdmin, pricingController.deletePricing);

module.exports = router;
