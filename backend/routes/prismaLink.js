const express = require("express");
const router = express.Router();
const controller = require("../controllers/prismaLinkController");

// Initiate Payment
router.post("/create", controller.createTransaction);

// Webhook Callback (Backend to Backend)
router.post("/webhook", controller.handleWebhook);
router.post("/disbursement", controller.handleDisbursementWebhook);

// Check Invoice Status (Frontend Polling)
router.get("/status/:invoice_number", controller.getStatus);

// Legacy/Dummy callback (optional, just to avoid 404 if user hits it)
router.get("/callback-dummy", (req, res) => res.send("Payment processed. You can close this window."));

module.exports = router;
