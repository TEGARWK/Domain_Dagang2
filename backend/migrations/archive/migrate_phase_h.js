const db = require("../config/db");

const migrationSql = `
-- 1. Create domain_event_logs table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS domain_event_logs (
    id SERIAL PRIMARY KEY,
    domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    from_status VARCHAR(50),
    to_status VARCHAR(50) NOT NULL,
    reason TEXT,
    api_raw_response JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add reconciliation columns to domains table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='domains' AND COLUMN_NAME='registration_attempt_count') THEN
        ALTER TABLE domains ADD COLUMN registration_attempt_count INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='domains' AND COLUMN_NAME='next_retry_at') THEN
        ALTER TABLE domains ADD COLUMN next_retry_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='domains' AND COLUMN_NAME='registrar_error_log') THEN
        ALTER TABLE domains ADD COLUMN registrar_error_log JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='domains' AND COLUMN_NAME='last_sync_at') THEN
        ALTER TABLE domains ADD COLUMN last_sync_at TIMESTAMP;
    END IF;
END $$;
`;

async function runMigration() {
    console.log("Starting Phase H Database Migration...");
    try {
        await db.pool.query(migrationSql);
        console.log("✅ Phase H Migration SUCCESS: Table `domain_event_logs` created and `domains` updated.");
    } catch (err) {
        console.error("❌ Phase H Migration FAILED:", err.message);
    } finally {
        process.exit();
    }
}

runMigration();
