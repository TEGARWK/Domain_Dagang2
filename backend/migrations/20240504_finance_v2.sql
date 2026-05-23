-- FINANCE SYSTEM V2 MIGRATION
-- Author: Antigravity (Senior Backend Developer)
-- Date: 2024-05-04

-- CLEANUP (Optional: Remove if you want to keep old prototypes)
-- DROP TABLE IF EXISTS finance_ledgers;
-- DROP TABLE IF EXISTS finance_variables;
-- DROP TABLE IF EXISTS finance_categories;

-- 1. SAVING CATEGORIES (Tier 1 - Gross Based)
CREATE TABLE IF NOT EXISTS saving_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER -- References users(id)
);

-- 2. PROFIT SHARING MEMBERS (Tier 2 - Remainder Based)
-- CONSTRAINT: Total percentage must be validated as 100% in app level
CREATE TABLE IF NOT EXISTS profit_sharing_members (
    id SERIAL PRIMARY KEY,
    party_name VARCHAR(100) NOT NULL,
    role VARCHAR(50),
    percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER -- References users(id)
);

-- 3. REVENUE PERIODS
CREATE TABLE IF NOT EXISTS revenue_periods (
    id SERIAL PRIMARY KEY,
    period_date DATE NOT NULL, -- First day of the month
    total_revenue DECIMAL(15,2) DEFAULT 0.00,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'applied')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    UNIQUE(period_date)
);

-- 4. REVENUE DISTRIBUTIONS (Snapshot of calculation)
CREATE TABLE IF NOT EXISTS revenue_distributions (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES revenue_periods(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SAVING', 'PROFIT_SHARING')),
    reference_id INTEGER NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    percentage_applied DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. CONFIG AUDIT LOGS
CREATE TABLE IF NOT EXISTS config_audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    action VARCHAR(50) NOT NULL, -- 'CREATE', 'UPDATE', 'DELETE'
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- TRIGGERS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_saving_cat_upd') THEN
        CREATE TRIGGER trg_saving_cat_upd BEFORE UPDATE ON saving_categories FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_profit_mem_upd') THEN
        CREATE TRIGGER trg_profit_mem_upd BEFORE UPDATE ON profit_sharing_members FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_rev_period_upd') THEN
        CREATE TRIGGER trg_rev_period_upd BEFORE UPDATE ON revenue_periods FOR EACH ROW EXECUTE PROCEDURE update_timestamp();
    END IF;
END $$;

-- RECOMMENDED INDEXES
CREATE INDEX IF NOT EXISTS idx_rev_dist_period_id ON revenue_distributions(period_id);
CREATE INDEX IF NOT EXISTS idx_rev_period_date ON revenue_periods(period_date);
CREATE INDEX IF NOT EXISTS idx_audit_table_record ON config_audit_logs(table_name, record_id);
