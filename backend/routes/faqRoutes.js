const express = require("express");
const router = express.Router();
const faqController = require("../controllers/faqController");
const { verifyToken } = require("../middleware/authMiddleware");

// Public Access
router.get("/", faqController.getAllFAQs);

// Protected Admin Routes
// Kita asumsikan middleware ini sudah diproteksi jwt sebelum mencapai file ini di index.js
router.post("/", verifyToken, faqController.createFAQ);
router.put("/:id", verifyToken, faqController.updateFAQ);
router.delete("/:id", verifyToken, faqController.deleteFAQ);

module.exports = router;
