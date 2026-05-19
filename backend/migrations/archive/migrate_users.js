const db = require("../config/db");

const alterQueries = [
    "ALTER TABLE users ADD COLUMN bio TEXT",
    "ALTER TABLE users ADD COLUMN address TEXT",
    "ALTER TABLE users ADD COLUMN avatar LONGTEXT" // LONGTEXT for base64
];

const runMigration = async () => {
    console.log("Starting migration...");
    for (const query of alterQueries) {
        await new Promise(resolve => {
            db.query(query, (err) => {
                if (err) {
                    // Ignore if duplicate/exists
                    if (err.code === 'ER_DUP_FIELDNAME') {
                        console.log("Column exists, skipping.");
                    } else {
                        console.error("Error:", err.message);
                    }
                } else {
                    console.log("Executed:", query);
                }
                resolve();
            });
        });
    }
    console.log("Migration finished.");
    process.exit(0);
};

runMigration();
