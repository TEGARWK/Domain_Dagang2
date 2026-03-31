const db = require("../config/db");

const fixQuery = "ALTER TABLE users MODIFY COLUMN avatar LONGTEXT";

console.log("Fixing avatar column...");
db.query(fixQuery, (err) => {
    if (err) {
        console.error("Error updating column:", err.message);
    } else {
        console.log("Success! Avatar column is now LONGTEXT.");
    }
    process.exit(0);
});
