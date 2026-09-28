-- =============================================
-- Migration: Create Activation Retry Queue Table
-- Description: Table for retrying failed domain activations
-- =============================================

CREATE TABLE IF NOT EXISTS activation_retry_queue (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL,
    domain_name VARCHAR(255) NOT NULL,
    attempt_count INT DEFAULT 1,
    last_error TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_activation_retry_queue_status_next_retry
ON activation_retry_queue (status, next_retry_at)
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_activation_retry_queue_invoice
ON activation_retry_queue (invoice_id, domain_name);
