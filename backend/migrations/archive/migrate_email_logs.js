const db = require('../config/db');

const migrate = async () => {
    try {
        console.log("Creating email_logs table...");
        
        const createTable = `
            CREATE TABLE IF NOT EXISTS email_logs (
                id SERIAL PRIMARY KEY,
                recipient VARCHAR(255) NOT NULL,
                subject VARCHAR(255) NOT NULL,
                template_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
                error_message TEXT,
                messge_id VARCHAR(255),
                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `;

        // Handle MySQL fallback if needed (SERIAL vs AUTO_INCREMENT)
        // db.js adaptor usually handles ? params but here we execute raw DDL
        // If environment is MySQL, SERIAL might not work or just be alias for BIGINT UNSIGNED NOT NULL AUTO_INCREMENT UNIQUE
        // Postgres: SERIAL is fine.
        // Let's rely on standard SQL or robust check.
        // Since previous migration used SERIAL for PG, we stick to it.
        
        await new Promise((resolve, reject) => {
             db.query(createTable, (err, res) => {
                 if (err) {
                     // If error is syntax error (e.g. MySQL not liking SERIAL), try AUTO_INCREMENT
                     if (err.code === '42601' || err.sqlState === '42601') { 
                         console.log("Retrying with MySQL syntax...");
                         const mysqlQuery = `
                            CREATE TABLE IF NOT EXISTS email_logs (
                                id INT AUTO_INCREMENT PRIMARY KEY,
                                recipient VARCHAR(255) NOT NULL,
                                subject VARCHAR(255) NOT NULL,
                                template_type VARCHAR(50) NOT NULL,
                                status VARCHAR(20) DEFAULT 'pending',
                                error_message TEXT,
                                messge_id VARCHAR(255),
                                sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                            );
                         `;
                         db.query(mysqlQuery, (e2, r2) => {
                             if (e2) reject(e2);
                             else resolve(r2);
                         });
                     } else {
                         reject(err);
                     }
                 } else {
                     resolve(res);
                 }
             });
        });

        console.log("email_logs table created.");
        process.exit(0);

    } catch (e) {
        console.error("Migration Failed:", e);
        process.exit(1);
    }
};

migrate();
