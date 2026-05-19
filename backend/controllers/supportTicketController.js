const db = require("../config/db");
const { createLog } = require("./auditController");
const NotificationService = require("../services/NotificationService");

// Member: Create a new ticket
exports.createTicket = async (req, res) => {
  const { id: user_id } = req.user; // Dari verifyToken middleware
  const { subject, message, attachments } = req.body;

  try {
    const result = await db.query(
      "INSERT INTO support_tickets (user_id, subject, message, status, attachments) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [user_id, subject, message, 'open', JSON.stringify(attachments || [])]
    );

    const ticket = result[0];

    // 1. Audit Log (Penanda Sistem)
    await createLog({
        user_id: user_id,
        action: 'CREATE_SUPPORT_TICKET',
        entity_type: 'support_ticket',
        entity_id: ticket.id,
        new_value: { subject },
        req
    });

    // 2. Dashboard Notification (Notifikasi Pengguna)
    await NotificationService.createNotification(
        user_id,
        "Tiket Bantuan Terkirim",
        `Tiket Anda mengenai "${subject}" telah kami terima dan akan segera diproses.`,
        "info",
        ticket.id,
        "support_ticket"
    );

    // 3. Admin Notification (Notifikasi ke Admin)
    await NotificationService.createAdminNotification(
        "Tiket Bantuan Baru",
        `Ada tiket bantuan baru dari member mengenai: "${subject}"`,
        "warning",
        ticket.id,
        "support_ticket"
    );

    res.status(201).json({ message: "Pesan berhasil dikirim", ticket });
  } catch (err) {
    console.error("Create ticket error:", err);
    res.status(500).json({ error: "Gagal mengirim tiket bantuan" });
  }
};

// Member: Get own tickets
exports.getMyTickets = async (req, res) => {
  const { id: user_id } = req.user;
  try {
    const result = await db.query(
      "SELECT * FROM support_tickets WHERE user_id = $1 ORDER BY updated_at DESC",
      [user_id]
    );
    res.json(result);
  } catch (err) {
    console.error("Fetch my tickets error:", err);
    res.status(500).json({ error: "Gagal mengambil riwayat tiket" });
  }
};

// Admin: Get all tickets
exports.getAllTickets = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT st.*, u.name as user_name, u.email as user_email 
      FROM support_tickets st 
      JOIN users u ON st.user_id = u.id 
      ORDER BY st.updated_at DESC
    `);
    res.json(result);
  } catch (err) {
    console.error("Fetch all tickets error:", err);
    res.status(500).json({ error: "Gagal mengambil daftar tiket" });
  }
};

// Member & Admin: Get specific ticket details with replies
exports.getTicketDetails = async (req, res) => {
  const { id } = req.params;
  const { id: user_id, role } = req.user;

  try {
    // 1. Get Ticket info
    const ticketResult = await db.query(
      `SELECT st.*, u.name as user_name, u.email as user_email 
       FROM support_tickets st 
       JOIN users u ON st.user_id = u.id 
       WHERE st.id = $1`,
      [id]
    );

    if (ticketResult.length === 0) {
      return res.status(404).json({ error: "Tiket tidak ditemukan" });
    }

    const ticket = ticketResult[0];

    // Security: Check if user owns the ticket (unless admin)
    if (role !== 'admin' && ticket.user_id !== user_id) {
      return res.status(403).json({ error: "Akses ditolak" });
    }

    // 2. Get Replies
    const replies = await db.query(
      `SELECT tr.*, u.name as sender_name, u.avatar as sender_avatar
       FROM ticket_replies tr
       JOIN users u ON tr.user_id = u.id
       WHERE tr.ticket_id = $1
       ORDER BY tr.created_at ASC`,
      [id]
    );

    res.json({ ...ticket, replies });
  } catch (err) {
    console.error("Fetch ticket details error:", err);
    res.status(500).json({ error: "Gagal mengambil detail tiket" });
  }
};

// Member & Admin: Reply to a ticket
exports.createReply = async (req, res) => {
  const { id: ticket_id } = req.params;
  const { id: user_id, role } = req.user;
  const { message, attachments } = req.body;
  const is_admin = role === 'admin';

  try {
    // 1. Insert Reply
    const result = await db.query(
      "INSERT INTO ticket_replies (ticket_id, user_id, message, is_admin, attachments) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [ticket_id, user_id, message, is_admin, JSON.stringify(attachments || [])]
    );

    // 2. Update Ticket Status & updated_at
    // If admin replies, set to 'answered'. If user replies, set to 'open/waiting'
    const newStatus = is_admin ? 'answered' : 'open';
    await db.query(
      "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2",
      [newStatus, ticket_id]
    );

    const reply = result[0];

    // 3. Notifications
    const ticketInfo = await db.query("SELECT subject, user_id FROM support_tickets WHERE id = $1", [ticket_id]);
    const ticket = ticketInfo[0];

    if (is_admin) {
      // Notify User
      await NotificationService.createNotification(
        ticket.user_id,
        "Balasan Tiket Bantuan",
        `Admin telah membalas tiket Anda: "${ticket.subject}"`,
        "success",
        ticket_id,
        "support_ticket"
      );
    } else {
      // Notify Admin
      await NotificationService.createAdminNotification(
        "Balasan Tiket dari Member",
        `Ada balasan baru pada tiket: "${ticket.subject}"`,
        "info",
        ticket_id,
        "support_ticket"
      );
    }

    res.status(201).json({ message: "Balasan terkirim", reply });
  } catch (err) {
    console.error("Create reply error:", err);
    res.status(500).json({ error: "Gagal mengirim balasan" });
  }
};

// Admin: Update ticket Status only
exports.updateStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query(
      "UPDATE support_tickets SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, id]
    );
    res.json({ message: "Status tiket diperbarui" });
  } catch (err) {
    res.status(500).json({ error: "Gagal merubah status" });
  }
};

// Admin: Delete ticket
exports.deleteTicket = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query("DELETE FROM support_tickets WHERE id = $1", [id]);
    res.json({ message: "Tiket berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: "Gagal menghapus tiket" });
  }
};
