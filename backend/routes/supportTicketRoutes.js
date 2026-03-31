const express = require("express");
const router = express.Router();
const supportTicketController = require("../controllers/supportTicketController");
const { verifyToken } = require("../middleware/authMiddleware");

// Semua Rute Bantuan butuh Login
router.use(verifyToken);

// Actions Untuk Member
router.post("/", supportTicketController.createTicket);
router.get("/my-tickets", supportTicketController.getMyTickets);

// Actions Untuk Admin 
// (Asumsinya kalau ada checking admin roles, bisa ditaruh di sini atau di index.js)
router.get("/all", supportTicketController.getAllTickets);
router.put("/:id", supportTicketController.updateTicket);
router.delete("/:id", supportTicketController.deleteTicket);

module.exports = router;
