-- ---------------------------------------------
-- FINANCE & REVENUE DISTRIBUTION SYSTEM
-- ---------------------------------------------

-- 1. Categories (e.g., 'Data Saving', 'Profit Sharing')
CREATE TABLE IF NOT EXISTS finance_categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Variables (e.g., 'Pajak', 'Zakat', 'Developer A')
CREATE TABLE IF NOT EXISTS finance_variables (
    id SERIAL PRIMARY KEY,
    category_id INT NOT NULL REFERENCES finance_categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    percentage DECIMAL(5, 2) NOT NULL DEFAULT 0, -- Store as percentage (e.g., 10.00 for 10%)
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Ledgers (Records of actual money allocated)
CREATE TABLE IF NOT EXISTS finance_ledgers (
    id SERIAL PRIMARY KEY,
    variable_id INT NOT NULL REFERENCES finance_variables(id) ON DELETE CASCADE,
    invoice_id VARCHAR(100) REFERENCES invoices(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed Default Categories
INSERT INTO finance_categories (name, description) VALUES 
('Data Saving', 'Reserves for operations, taxes, and social obligations'),
('Profit Sharing', 'Revenue distribution for project members and developers')
ON CONFLICT DO NOTHING;

-- Seed Sample Variables (Disabled by default, Admin can enable/edit)
INSERT INTO finance_variables (category_id, name, percentage, is_active) VALUES 
(1, 'Pajak', 0.00, false),
(1, 'Zakat', 2.50, true),
(1, 'Operasional', 10.00, true)
ON CONFLICT DO NOTHING;
