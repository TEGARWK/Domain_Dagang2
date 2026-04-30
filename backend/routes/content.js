const express = require("express");
const router = express.Router();
const db = require("../config/db");
const { verifyToken, verifyAdmin } = require("../middleware/authMiddleware");

// GET Banner Config (legacy)
router.get("/banner", (req, res) => {
  const query = "SELECT setting_value FROM site_settings WHERE setting_key = 'home_banner'";
  db.pool.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    if (results.rows.length > 0) {
        res.json(results.rows[0].setting_value);
    } else {
        res.status(404).json({ message: "Config not found" });
    }
  });
});

// UPDATE Banner Config (legacy)
router.post("/banner", (req, res) => {
  const settings = req.body;
  const query = `
    INSERT INTO site_settings (setting_key, setting_value)
    VALUES ('home_banner', $1)
    ON CONFLICT (setting_key)
    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
  `;

  db.pool.query(query, [JSON.stringify(settings)], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Banner config updated successfully" });
  });
});

// ─────────────────────────────────────────────────────────────
// SITE SETTINGS — Public GET (untuk Footer & halaman publik)
// ─────────────────────────────────────────────────────────────

/**
 * GET /api/content/site-settings
 * Ambil semua setting dalam format { key: value } untuk dikonsumsi footer publik.
 */
router.get("/site-settings", async (req, res) => {
  try {
    const result = await db.pool.query(
      "SELECT setting_key, setting_value FROM site_settings"
    );

    const safeParse = (data) => {
      if (!data) return data;
      if (typeof data !== 'string') return data;
      try {
        // Hanya parse jika terlihat seperti JSON array atau objek
        if (data.trim().startsWith('[') || data.trim().startsWith('{')) {
          return JSON.parse(data);
        }
        return data;
      } catch (e) {
        return data;
      }
    };

    // Ubah ke objek flat { key: value } agar mudah dipakai frontend
    const settings = {};
    result.rows.forEach((row) => {
      settings[row.setting_key] = safeParse(row.setting_value);
    });

    res.json({ success: true, data: settings });
  } catch (err) {
    console.error("Error get site-settings:", err);
    res.status(500).json({ success: false, message: "Gagal mengambil site settings" });
  }
});

/**
 * GET /api/content/site-settings/full
 * Ambil semua setting lengkap dengan label & group (untuk form Admin Panel).
 * Protected: Admin only.
 */
router.get("/site-settings/full", verifyAdmin, async (req, res) => {
  try {
    const result = await db.pool.query(
      "SELECT setting_key, setting_value, setting_group, label, description, updated_at FROM site_settings ORDER BY id"
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("Error get site-settings/full:", err);
    res.status(500).json({ success: false, message: "Gagal mengambil data settings" });
  }
});

/**
 * PUT /api/content/site-settings
 * Update batch site settings dari Admin Panel.
 * Body: { settings: { key1: value1, key2: value2, ... } }
 * Protected: Admin only.
 */
router.put("/site-settings", verifyAdmin, async (req, res) => {
  const { settings } = req.body;

  if (!settings || typeof settings !== "object") {
    return res.status(400).json({ success: false, message: "Format settings tidak valid" });
  }

  try {
    const entries = Object.entries(settings);

    // Upsert setiap key secara paralel
    await Promise.all(
      entries.map(([key, value]) => {
        const finalValue = typeof value === 'object' ? JSON.stringify(value) : value;
        return db.pool.query(
          `INSERT INTO site_settings (setting_key, setting_value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (setting_key)
           DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
          [key, finalValue]
        );
      })
    );

    res.json({ success: true, message: "Site settings berhasil disimpan" });
  } catch (err) {
    console.error("Error update site-settings:", err);
    res.status(500).json({ success: false, message: "Gagal menyimpan settings" });
  }
});

module.exports = router;
