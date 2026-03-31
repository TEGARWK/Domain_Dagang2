const db = require("../config/db");
const { createLog } = require("./auditController");
const NotificationService = require("../services/NotificationService");

// Member: Create a new ticket
exports.createTicket = async (req, res) => {
  const { id: user_id } = req.user; // Dari verifyToken middleware
  const { subject, message } = req.body;

  try {
    const result = await db.query(
      "INSERT INTO support_tickets (user_id, subject, message, status) VALUES ($1, $2, $3, $4) RETURNING *",
      [user_id, subject, message, 'open']
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

// Admin: Update ticket (Reply & Status)
exports.updateTicket = async (req, res) => {
  const { id } = req.params;
  const { status, admin_reply } = req.body;

  try {
    const result = await db.query(
      "UPDATE support_tickets SET status = $1, admin_reply = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *",
      [status, admin_reply, id]
    );

    const ticket = result[0];

    // 1. Audit Log (Penanda Update)
    await createLog({
        user_id: req.user.id,
        action: 'UPDATE_SUPPORT_TICKET',
        entity_type: 'support_ticket',
        entity_id: id,
        new_value: { status, admin_reply },
        req
    });

    // 2. Notification (Jika ada balasan admin)
    if (admin_reply) {
        await NotificationService.createNotification(
            ticket.user_id,
            "Balasan Tiket Bantuan",
            `Admin telah membalas tiket Anda: "${ticket.subject}"`,
            "success",
            id,
            "support_ticket"
        );
    }

    res.json({ message: "Tiket berhasil diperbarui", ticket });
  } catch (err) {
    console.error("Update ticket error:", err);
    res.status(500).json({ error: "Gagal memperbarui tiket" });
  }
};

// Admin: Delete ticket
exports.deleteTicket = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query("DELETE FROM support_tickets WHERE id = $1 RETURNING *", [id]);
    if (result.length === 0) {
      return res.status(404).json({ error: "Tiket tidak ditemukan" });
    }
    res.json({ message: "Tiket berhasil dihapus" });
  } catch (err) {
    console.error("Delete ticket error:", err);
    res.status(500).json({ error: "Gagal menghapus tiket" });
  }
};
