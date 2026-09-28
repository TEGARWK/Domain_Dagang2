const express = require("express");
const router = express.Router();
const pricingController = require("../controllers/pricingController");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

router.get("/all", pricingController.getAllPricing);
router.post("/sync", verifyAdmin, pricingController.syncPricing); // Sync from Daftarnama
router.post("/add", verifyAdmin, pricingController.addPricing);
router.put("/:id", verifyAdmin, pricingController.updatePricing);
router.patch("/:id/margin", verifyAdmin, pricingController.updateMargin); // Update margin only
router.delete("/:id", verifyAdmin, pricingController.deletePricing);

module.exports = router;
