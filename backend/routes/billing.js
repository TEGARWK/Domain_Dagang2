const express = require("express");
const router = express.Router();
const controller = require("../controllers/billingController");
const { verifyToken } = require("../middleware/authMiddleware");
const { verifyAdmin } = require("../middleware/adminMiddleware");

router.get("/all", verifyAdmin, controller.getAllInvoices); // LIST ALL INVOICES (ADMIN)
router.get("/invoice/:id/admin", verifyAdmin, controller.getInvoiceByIdAdmin); // ADMIN DETAIL
router.get("/user/:userId", verifyToken, controller.getInvoices);
router.get("/invoice/:id", verifyToken, controller.getInvoiceById);

// Admin Actions
router.get("/admin/user/:userId/invoices", verifyAdmin, controller.getUserInvoicesAdmin);
router.post("/invoice/:id/pay", verifyAdmin, controller.payInvoice);
router.post("/invoice/:id/pay-wallet", verifyToken, controller.payInvoiceWithWallet);
router.put("/invoice/:id/cancel", verifyToken, controller.cancelInvoice);
router.post("/invoice/:id/recalculate", verifyToken, controller.recalculateInvoice);
router.delete("/invoice/:id", verifyAdmin, controller.deleteInvoice);

module.exports = router;
