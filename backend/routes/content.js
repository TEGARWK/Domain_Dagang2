const express = require("express");
const router = express.Router();
const db = require("../config/db");

// GET Banner Config
router.get("/banner", (req, res) => {
  const query = "SELECT setting_value FROM site_settings WHERE setting_key = 'home_banner'";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    
    if (results.length > 0) {
        res.json(results[0].setting_value);
    } else {
        res.status(404).json({ message: "Config not found" });
    }
  });
});

// UPDATE Banner Config (Admin Only - simplified for now)
router.post("/banner", (req, res) => {
  const settings = req.body; // Full JSON object
  const query = `
    INSERT INTO site_settings (setting_key, setting_value) 
    VALUES ('home_banner', ?) 
    ON CONFLICT (setting_key) 
    DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = CURRENT_TIMESTAMP
  `;
  
  db.query(query, [JSON.stringify(settings)], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Banner config updated successfully" });
  });
});

module.exports = router;
