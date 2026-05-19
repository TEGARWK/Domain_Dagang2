const express = require("express");
const router = express.Router();
const supportTicketController = require("../controllers/supportTicketController");
const { verifyToken } = require("../middleware/authMiddleware");

// Semua Rute Bantuan butuh Login
router.use(verifyToken);

// Actions Untuk Admin 
router.get("/all", supportTicketController.getAllTickets);

// Actions Untuk Member & Shared
router.post("/", supportTicketController.createTicket);
router.get("/my-tickets", supportTicketController.getMyTickets);
router.get("/:id", supportTicketController.getTicketDetails);
router.post("/:id/replies", supportTicketController.createReply);

// Administrative Actions
router.put("/:id/status", supportTicketController.updateStatus);
router.delete("/:id", supportTicketController.deleteTicket);

module.exports = router;
