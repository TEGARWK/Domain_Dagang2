const db = require("../config/db");
const bcrypt = require("bcryptjs"); // using bcryptjs as installed

console.log("Starting password migration...");

const sql = "SELECT id, password FROM users";

db.query(sql, (err, users) => {
    if (err) {
        console.error("Error fetching users:", err);
        process.exit(1);
    }

    let updatedCount = 0;
    let processedCount = 0;

    if (users.length === 0) {
        console.log("No users found.");
        process.exit(0);
    }

    users.forEach((user) => {
        // Check if password is already hashed (bcrypt hashes start with $2a$ or $2b$)
        if (!user.password.startsWith("$2")) {
            const salt = bcrypt.genSaltSync(10);
            const hashed = bcrypt.hashSync(user.password, salt);
            
            db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, user.id], (err) => {
                if (err) console.error(`Failed to update user ${user.id}:`, err);
                else updatedCount++;
                
                processedCount++;
                if (processedCount === users.length) {
                    console.log(`Migration complete. Updated ${updatedCount} users.`);
                    process.exit(0);
                }
            });
        } else {
            console.log(`User ${user.id} already hashed. Skipping.`);
            processedCount++;
            if (processedCount === users.length) {
                console.log(`Migration complete. Updated ${updatedCount} users.`);
                process.exit(0);
            }
        }
    });
});
