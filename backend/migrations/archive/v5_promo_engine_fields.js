const db = require('../config/db');

const runMigration = async () => {
    try {
        console.log("🚀 Starting V5 Migration: Promo Engine Fields...");
        
        const queries = [
            "ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS start_date TIMESTAMP NULL",
            "ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS end_date TIMESTAMP NULL",
            "ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS usage_limit_total INT DEFAULT 0",
            "ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS usage_limit_per_user INT DEFAULT 1",
            "ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS used_count INT DEFAULT 0",
            "ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0",
            "ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS segment VARCHAR(20) DEFAULT 'all'"
        ];

        for (const query of queries) {
            console.log(`Executing: ${query}`);
            await db.query(query);
        }

        console.log("✅ V5 Migration Completed Successfully!");
        process.exit(0);

    } catch (error) {
        console.error("❌ Migration Failed:", error);
        process.exit(1);
    }
};

runMigration();
