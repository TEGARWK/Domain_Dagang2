const db = require("../config/db");

const createTable = `
  CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value JSON NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  )
`;

db.query(createTable, (err, result) => {
  if (err) {
    console.error("❌ Error creating table:", err);
    process.exit(1);
  } else {
    console.log("✅ Site Settings table ready!");
    
    // Insert default banner if not exists
    const defaultBanner = JSON.stringify({
        title: "Gajian Sale!",
        subtitle: "TLD .ID Cuma 10rb.",
        buttonText: "Beli Sekarang",
        imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
    });

    const initData = `
        INSERT IGNORE INTO site_settings (setting_key, setting_value) 
        VALUES ('home_banner', ?)
    `;

    db.query(initData, [defaultBanner], (err, res) => {
        if(err) console.error("Warning init data:", err);
        else console.log("✅ Default banner config initialized");
        process.exit();
    });
  }
});
