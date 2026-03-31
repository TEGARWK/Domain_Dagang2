const db = require('../config/db');

const migrate = async () => {
    try {
        console.log("Starting Invoice Items Schema Migration...");

        // 1. Add unit_price
        // Check if exists first or just try ADD COLUMN (MySQL/PG syntax might differ slightly, using IF NOT EXISTS logic if possible or catch error)
        // Since we support both PG and MySQL in this project (as seen in db.js adapter), we should be careful.
        // db.js uses PG pool but adapts ? to $1.
        // standard SQL: ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS ...
        // PostgreSQL supports IF NOT EXISTS in newer versions.
        
        const alterQueries = [
            `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(15, 2) DEFAULT 0;`,
            `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS years INT DEFAULT 1;`,
            `ALTER TABLE invoice_items ADD COLUMN IF NOT EXISTS pricing_source VARCHAR(50) DEFAULT 'system';`
        ];

        for (const query of alterQueries) {
            console.log(`Executing: ${query}`);
            await new Promise((resolve, reject) => {
                db.query(query, (err, res) => {
                    // Ignore "duplicate column" error if "IF NOT EXISTS" is not supported by the specific DB version (though PG 9.6+ supports it)
                    if (err) {
                        if (err.code === '42701') { // PG: duplicate_column
                             console.log("Column already exists, skipping.");
                             return resolve();
                        }
                        console.error("Migration Error:", err.message);
                        reject(err);
                    } else {
                        console.log("Success.");
                        resolve(res);
                    }
                });
            });
        }

        console.log("Migration Completed Successfully.");
        process.exit(0);

    } catch (error) {
        console.error("Fatal Migration Error:", error);
        process.exit(1);
    }
};

migrate();
