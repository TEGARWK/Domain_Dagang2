const db = require("../config/db");

const defaultBanner = JSON.stringify({
    title: "Gajian Sale!",
    subtitle: "TLD .ID Cuma 10rb.",
    buttonText: "Beli Sekarang",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=2426"
});

const query = "INSERT INTO site_settings (setting_key, setting_value) VALUES ('home_banner', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2";

// Note: adapter replaces ? -> $n, but here we can just use $1, $2 directly if we want to be safe,
// OR rely on the adapter. My adapter replaces ? with $n.
// Let's use ? to be consistent with adapter.
// WAIT. If I use ? in the query string, my adapter will replace it.
// "INSERT ... VALUES ('home_banner', ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = ?"
// 1st ? -> $1, 2nd ? -> $2.
// Perfect.

const pgQuery = "INSERT INTO site_settings (setting_key, setting_value) VALUES ('home_banner', ?) ON CONFLICT (setting_key) DO UPDATE SET setting_value = ?";

db.query(pgQuery, [defaultBanner, defaultBanner], (err, result) => {
  if (err) {
    console.error("❌ Error resetting banner:", err);
  } else {
    console.log("✅ Banner Config forced to Default!");
  }
  process.exit();
});
