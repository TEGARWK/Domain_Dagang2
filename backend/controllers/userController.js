const db = require("../config/db");
const bcrypt = require("bcryptjs");
const { createLog } = require("./auditController");

// --- UPDATE USER PROFILE ---
// --- UPDATE USER PROFILE ---
exports.updateUser = (req, res) => {
  const userId = req.params.id;
  const { id: currentUserId, role } = req.user;

  // Security Check: Only Owner OR Admin can update
  if (String(userId) !== String(currentUserId) && role !== 'admin') {
      return res.status(403).json("You are not allowed to update this user!");
  }
  
  const { name, phone, bio, avatar, address_line1, city, state, district, village, zip_code, country, role: newRole } = req.body;

  // Ideally we should use dynamic query construction, but for now strict params
  let sql = `
      UPDATE users 
      SET name = $1, phone = $2, bio = $3, avatar = $4, 
          address_line1 = $5, city = $6, state = $7, district = $8, village = $9, zip_code = $10, country = $11
  `;
  const values = [name, phone, bio, avatar, address_line1, city, state, district, village, zip_code, country];

  // Admin only: Can update role
  if (role === 'admin' && newRole) {
      sql += `, role = $${values.length + 1}`;
      values.push(newRole);
  }

  sql += ` WHERE id = $${values.length + 1}`;
  values.push(userId);

  db.pool.query(sql, values, async (err, result) => {
    if (err) {
        console.error(err);
        return res.status(500).json(err);
    }

    // Audit Log
    await createLog({
        user_id: currentUserId,
        action: 'UPDATE_USER',
        entity_type: 'user',
        entity_id: userId,
        new_value: req.body,
        req
    });

    return res.status(200).json("User has been updated.");
  });
};

// --- CHANGE PASSWORD ---
exports.changePassword = (req, res) => {
  const userId = req.params.id;
  const { currentPassword, newPassword } = req.body;

  // 1. Ambil password lama dari DB
  db.query("SELECT password FROM users WHERE id = $1", [userId], (err, data) => {
    if (err) return res.status(500).json(err);
    if (!data || data.length === 0) return res.status(404).json("User not found!");

    const user = data[0];

    // 2. Cek apakah password lama cocok (Hash vs Hash)
    const isMatch = bcrypt.compareSync(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json("Password saat ini salah!");
    }

    // 3. Hash password baru
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(newPassword, salt);

    // 4. Update di DB
    db.query("UPDATE users SET password = $1 WHERE id = $2", [hash, userId], (err, result) => {
      if (err) return res.status(500).json(err);
      return res.status(200).json("Password berhasil diubah!");
    });
  });
};
exports.getUser = (req, res) => {
  const userId = req.params.id;
  const sql = "SELECT id, name, email, phone, bio, address_line1, city, state, district, village, zip_code, country, avatar, role, created_at FROM users WHERE id = $1";

  db.query(sql, [userId], (err, data) => {
    if (err) return res.status(500).json(err);
    if (!data || data.length === 0) return res.status(404).json("User not found!");
    return res.status(200).json(data[0]);
  });
};

// --- GET ALL USERS (Admin Only) ---
exports.getAllUsers = (req, res) => {
  const sql = "SELECT id, name, email, phone, role, address_line1, city, state, district, village, zip_code, country, created_at FROM users ORDER BY created_at DESC";
  db.query(sql, (err, data) => {
    if (err) return res.status(500).json(err);
    return res.status(200).json(data);
  });
};
// --- DELETE USER (Admin Only) ---
exports.deleteUser = (req, res) => {
  const userId = req.params.id;
  const sql = "DELETE FROM users WHERE id = $1";
  
  db.query(sql, [userId], async (err, data) => {
    if (err) return res.status(500).json(err);

    // Audit Log
    await createLog({
        user_id: req.user.id,
        action: 'DELETE_USER',
        entity_type: 'user',
        entity_id: userId,
        req
    });

    return res.status(200).json("User has been deleted.");
  });
};
// --- GET USER ACTIVITIES ---
exports.getUserActivities = (req, res) => {
  const userId = req.user.id;
  const limit = req.query.limit || 5;

  const sql = `
    SELECT * FROM audit_logs 
    WHERE user_id = $1 
    ORDER BY created_at DESC 
    LIMIT $2
  `;

  db.query(sql, [userId, limit], (err, data) => {
    if (err) {
      console.error("🔥 Fetch activities bug:", err);
      return res.status(500).json(err);
    }
    return res.status(200).json(data);
  });
};
