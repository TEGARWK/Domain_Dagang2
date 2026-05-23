const db = require("../config/db");
const { createLog } = require("./auditController");

// 1. Get All FAQs (Public & Admin)
exports.getAllFAQs = async (req, res) => {
  const { category } = req.query;
  try {
    let query = "SELECT * FROM faqs WHERE is_active = TRUE";
    let params = [];

    if (category) {
      query += " AND category = $1";
      params.push(category);
    }

    query += " ORDER BY priority DESC, created_at DESC";
    
    const result = await db.query(query, params);
    res.json(Array.isArray(result) ? result : []);
  } catch (err) {
    console.error("Fetch FAQ Error:", err.message);
    res.json([]);
  }
};

// 2. Create FAQ (Admin Only)
exports.createFAQ = async (req, res) => {
  const { question, answer, category, order_num } = req.body;
  try {
    const result = await db.query(
      "INSERT INTO faqs (question, answer, category, order_num) VALUES ($1, $2, $3, $4) RETURNING *",
      [question, answer, category || 'Umum', order_num || 0]
    );

    // Audit Log
    await createLog({
      user_id: req.user.id,
      action: 'CREATE_FAQ',
      entity_type: 'faq',
      entity_id: result[0].id,
      new_value: result[0],
      req
    });

    res.status(201).json({ message: "FAQ berhasil ditambahkan", faq: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 3. Update FAQ (Admin Only)
exports.updateFAQ = async (req, res) => {
  const id = req.params.id;
  const { question, answer, category, order_num } = req.body;
  try {
    const result = await db.query(
      "UPDATE faqs SET question = $1, answer = $2, category = $3, order_num = $4 WHERE id = $5 RETURNING *",
      [question, answer, category, order_num, id]
    );
    if (result.length === 0) {
      return res.status(404).json({ error: "FAQ tidak ditemukan" });
    }

    // Audit Log
    await createLog({
      user_id: req.user.id,
      action: 'UPDATE_FAQ',
      entity_type: 'faq',
      entity_id: id,
      new_value: result[0],
      req
    });

    res.json({ message: "FAQ berhasil diperbarui", faq: result[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 4. Delete FAQ (Admin Only)
exports.deleteFAQ = async (req, res) => {
  const id = req.params.id;
  try {
    const result = await db.query("DELETE FROM faqs WHERE id = $1 RETURNING *", [id]);
    if (result.length === 0) {
      return res.status(404).json({ error: "FAQ tidak ditemukan" });
    }

    // Audit Log
    await createLog({
      user_id: req.user.id,
      action: 'DELETE_FAQ',
      entity_type: 'faq',
      entity_id: id,
      old_value: result[0],
      req
    });

    res.json({ message: "FAQ berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
