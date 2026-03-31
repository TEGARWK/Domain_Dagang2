const express = require("express");
const router = express.Router();
const controller = require("../controllers/walletController");
const withdrawalController = require("../controllers/withdrawalController");
const { verifyToken } = require("../middleware/authMiddleware");

router.get("/", verifyToken, controller.getMyWallet);

// --- 3. Withdrawals ---
router.post("/withdraw", verifyToken, withdrawalController.createRequest);
router.get("/withdrawals/my", verifyToken, withdrawalController.getMyHistory);

module.exports = router;
