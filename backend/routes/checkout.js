const express = require("express");
const router = express.Router();
const checkoutController = require("../controllers/checkoutController");

router.post("/", checkoutController.processCheckout);
router.post("/topup", checkoutController.processTopUp);
router.post("/preview", checkoutController.calculateCartPreview);

module.exports = router;
