-- FIX: Create missing vouchers and user_vouchers tables for VoucherService.js
-- Based on the schema expected by VoucherService.js

CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    banner_image TEXT,
    subtitle TEXT,
    type VARCHAR(20) DEFAULT 'fixed', -- fixed, percentage
    value DECIMAL(15, 2) DEFAULT 0,
    min_purchase DECIMAL(15, 2) DEFAULT 0,
    usage_limit_total INT DEFAULT 0,
    used_count INT DEFAULT 0,
    valid_until TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_date TIMESTAMP WITH TIME ZONE,
    eligible_tlds JSONB DEFAULT '[]',
    eligible_actions JSONB DEFAULT '["register"]',
    is_stackable BOOLEAN DEFAULT FALSE,
    is_new_user_only BOOLEAN DEFAULT FALSE,
    max_discount DECIMAL(15, 2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_automatic BOOLEAN DEFAULT FALSE,
    usage_limit_per_user INT DEFAULT 1,
    priority INT DEFAULT 0,
    segment VARCHAR(50) DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_vouchers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'claimed', -- claimed, used, expired
    used_at TIMESTAMP WITH TIME ZONE,
    order_id VARCHAR(100),
    UNIQUE(user_id, coupon_id)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_user ON user_vouchers(user_id);
