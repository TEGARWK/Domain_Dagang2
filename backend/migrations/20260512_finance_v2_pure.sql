-- Finance System V2 (Pure Revenue Model)
-- Date: 2026-05-12

-- 1. finance_periods: Rekap bulanan
CREATE TABLE IF NOT EXISTS finance_periods (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    omset NUMERIC(15, 2) DEFAULT 0,
    data_saving_total NUMERIC(15, 2) DEFAULT 0,
    net_profit NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(month, year)
);

-- 2. finance_configs: Pengaturan persentase (Saving & Distribution)
CREATE TABLE IF NOT EXISTS finance_configs (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES finance_periods(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SAVING', 'DISTRIBUTION')),
    name VARCHAR(100) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. finance_money_locations: Dompet fisik/digital
CREATE TABLE IF NOT EXISTS finance_money_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0,
    is_main BOOLEAN DEFAULT false,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. finance_profit_holders: Penerima bagi hasil (Stakeholders)
CREATE TABLE IF NOT EXISTS finance_profit_holders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    current_month_right NUMERIC(15, 2) DEFAULT 0,
    total_taken NUMERIC(15, 2) DEFAULT 0,
    balance NUMERIC(15, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. finance_internal_mutations: Buku besar arus kas
CREATE TABLE IF NOT EXISTS finance_internal_mutations (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES finance_periods(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('SAVING', 'PROFIT_SHARE', 'AVAILABLE_MONEY')),
    location_id INTEGER REFERENCES finance_money_locations(id) ON DELETE CASCADE,
    target_location_id INTEGER REFERENCES finance_money_locations(id) ON DELETE CASCADE,
    nominal NUMERIC(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_finance_mutations_period ON finance_internal_mutations(period_id);
CREATE INDEX IF NOT EXISTS idx_finance_configs_period ON finance_configs(period_id);
