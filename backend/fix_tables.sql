CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(100) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    transaction_id VARCHAR(100) UNIQUE NOT NULL, -- merchant_ref_no
    amount DECIMAL(15, 2) NOT NULL,
    payment_method VARCHAR(50),
    status VARCHAR(50) DEFAULT 'PENDING',
    raw_response JSONB,
    va_number VARCHAR(50),
    expired_at TIMESTAMP WITH TIME ZONE,
    plink_ref_no VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    action VARCHAR(255) NOT NULL,
    description TEXT,
    user_type VARCHAR(50) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_number);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_invoice ON activity_logs(invoice_id);
