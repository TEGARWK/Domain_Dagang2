const db = require("../config/db");

const alterQueries = [
    "ALTER TABLE domains ADD COLUMN registration_date DATE",
    "ALTER TABLE domains ADD COLUMN is_locked BOOLEAN DEFAULT FALSE",
    "ALTER TABLE domains ADD COLUMN auth_code VARCHAR(255)",
    "ALTER TABLE domains ADD COLUMN nameservers LONGTEXT" // JSON string
];

const runMigration = async () => {
    console.log("Starting domain migration...");
    for (const query of alterQueries) {
        await new Promise(resolve => {
            db.query(query, (err) => {
                if (err) {
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
    
    // Update existing rows with dummy data if needed
    const updateQuery = `
        UPDATE domains SET 
        registration_date = DATE(created_at), 
        is_locked = 1,
        auth_code = 'JD93-KLS8-22XA',
        nameservers = '["ns1.domainhost.com", "ns2.domainhost.com"]'
        WHERE registration_date IS NULL
    `;
    
    db.query(updateQuery, (err) => {
        if(err) console.error("Error updating dummy data:", err);
        else console.log("Updated existing domains with default values.");
        console.log("Migration finished.");
        process.exit(0);
    });
};

runMigration();
