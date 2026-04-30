-- =============================================
-- MASTER CONSOLIDATED SCHEMA: master_database.sql
-- DESCRIPTION: Full PostgreSQL Initial Schema + Seed Data
-- AUTHOR: Antigravity
-- VERSION: 2.1 (Added Regions & Final Column Fixes)
-- =============================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------
-- 0. CUSTOM TYPES (ENUMS)
-- ---------------------------------------------
DO $$ BEGIN
    CREATE TYPE mutation_type AS ENUM ('debit', 'credit', 'adjustment');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------
-- 1. AUTH & USER SYSTEM
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(50),
    password VARCHAR(255) NOT NULL,
    bio TEXT,
    address_line1 TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'ID',
    avatar TEXT,
    role VARCHAR(20) DEFAULT 'user',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(255),
    reset_token VARCHAR(255),
    reset_token_expires TIMESTAMP WITH TIME ZONE,
    
    -- Referral Columns
    referral_code VARCHAR(50) UNIQUE,
    referred_by_id INT REFERENCES users(id) ON DELETE SET NULL,
    referral_reward_total DECIMAL(15, 2) DEFAULT 0.00,
    referral_code_customized BOOLEAN DEFAULT FALSE,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 2. WALLET SYSTEM
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS wallets (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(15, 2) DEFAULT 0.00,
    balance_locked DECIMAL(15, 2) DEFAULT 0.00,
    currency VARCHAR(10) DEFAULT 'IDR',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wallet_transactions (
    id SERIAL PRIMARY KEY,
    wallet_id INT NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- CREDIT, DEBIT
    amount DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    reference_type VARCHAR(50), -- invoice, withdrawal, adjustment
    reference_id VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 3. DOMAIN & INFRASTRUCTURE
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS pricing (
    id SERIAL PRIMARY KEY,
    tld VARCHAR(20) NOT NULL UNIQUE,
    price_register DECIMAL(15, 2) NOT NULL DEFAULT 0,
    price_renew DECIMAL(15, 2) NOT NULL DEFAULT 0,
    price_transfer DECIMAL(15, 2) NOT NULL DEFAULT 0,
    price_restore DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_register DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_renew DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_transfer DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_restore DECIMAL(15, 2) NOT NULL DEFAULT 0,
    discount_price_reg DECIMAL(15, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domains (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    status VARCHAR(50) DEFAULT 'pending',
    document_status VARCHAR(50),
    auto_renew BOOLEAN DEFAULT FALSE,
    is_locked BOOLEAN DEFAULT FALSE,
    auth_code VARCHAR(255),
    nameservers TEXT, -- JSON Array
    registration_date DATE,
    expiration_date TIMESTAMP WITH TIME ZONE,
    registrar_name VARCHAR(100) DEFAULT 'Daftarnama',
    registrar_order_id VARCHAR(100),
    registrar_domain_id VARCHAR(100),
    registrar_response_raw JSONB,
    registrant_snapshot JSONB,
    last_registration_error TEXT,
    last_document_sync_at TIMESTAMP WITH TIME ZONE,
    last_document_upload_attempt_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    is_transfer_locked BOOLEAN DEFAULT FALSE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dns_records (
    id SERIAL PRIMARY KEY,
    domain_id INT NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    ttl INT DEFAULT 14400,
    priority INT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 4. BILLING & INVOICES
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
    id VARCHAR(100) PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending',
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    due_date TIMESTAMP WITH TIME ZONE,
    coupon_code VARCHAR(50),
    subtotal DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_discount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    net_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    final_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15, 2) NOT NULL DEFAULT 0,
    profit_amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    profit_margin_percent DECIMAL(10, 8) DEFAULT 0,
    tax_subsidy_amount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL DEFAULT 0,
    checkout_config JSONB DEFAULT '{}',
    discount_meta JSONB DEFAULT '{}',
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    plink_ref_no VARCHAR(100),
    paid_at TIMESTAMP WITH TIME ZONE,
    refunded_at TIMESTAMP WITH TIME ZONE,
    refund_reason TEXT,
    type VARCHAR(50) DEFAULT 'DOMAIN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id VARCHAR(100) NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    unit_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    cost_price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    years INT DEFAULT 1,
    pricing_source VARCHAR(50),
    action_type VARCHAR(50), -- register, renew, transfer, topup
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 5. PAYMENT & ACTIVITY LOGS
-- ---------------------------------------------
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
    
    -- Tripay Columns
    tripay_reference VARCHAR(100),
    pay_url TEXT,

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

-- ---------------------------------------------
-- 6. DISBURSEMENT & FINANCIALS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS payment_gateways (
    id SERIAL PRIMARY KEY,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    account_holder VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    provider VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    instructions TEXT,
    
    -- Tripay / Advanced Columns
    mode VARCHAR(20) DEFAULT 'sandbox',
    api_key TEXT,
    private_key TEXT,
    merchant_code VARCHAR(100),
    webhook_url TEXT,
    enabled_methods JSONB DEFAULT '[]',
    enabled_banks JSONB DEFAULT '[]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrar_balances (
    id SERIAL PRIMARY KEY,
    registrar_name VARCHAR(50) UNIQUE NOT NULL DEFAULT 'daftarnama',
    current_balance DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'IDR',
    low_balance_threshold DECIMAL(15, 2) DEFAULT 500000,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS registrar_mutations (
    id SERIAL PRIMARY KEY,
    registrar_name VARCHAR(50) DEFAULT 'daftarnama',
    type mutation_type NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    description VARCHAR(255),
    reference_id VARCHAR(100),
    balance_after DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15,2) NOT NULL,
    fee DECIMAL(15,2) DEFAULT 0,
    method VARCHAR(50), 
    account_number VARCHAR(100),
    account_name VARCHAR(100),
    status VARCHAR(30) DEFAULT 'pending',
    admin_notes TEXT,
    processed_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdraw_transactions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(100) UNIQUE,
    amount DECIMAL(15,2) NOT NULL,
    bank_code VARCHAR(20),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_name VARCHAR(100),
    reference_id VARCHAR(100), 
    status VARCHAR(20) DEFAULT 'pending',
    gateway_response TEXT,
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 7. REFERRAL SYSTEM
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS referral_tiers (
    id SERIAL PRIMARY KEY,
    tier_name VARCHAR(50) NOT NULL,
    min_referrals INT NOT NULL,
    reward_amount DECIMAL(15, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_rewards (
    id SERIAL PRIMARY KEY,
    referrer_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    invoice_id VARCHAR(100) REFERENCES invoices(id) ON DELETE SET NULL,
    reward_amount DECIMAL(15, 2) NOT NULL,
    referee_discount DECIMAL(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending', -- pending, active, cancelled
    holding_until TIMESTAMP WITH TIME ZONE,
    activated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 8. MARKETING & PROMO
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS promo_events (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    banner_image TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage')),
    value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    max_discount DECIMAL(15, 2) DEFAULT 0,
    min_purchase DECIMAL(15, 2) DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    
    -- Advanced Promo Columns
    is_automatic BOOLEAN DEFAULT TRUE,
    eligible_tlds JSONB DEFAULT '["all"]',
    eligible_actions JSONB DEFAULT '["all"]',

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vouchers (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    description TEXT,
    banner_image TEXT,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('fixed', 'percentage')),
    discount_value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    max_discount DECIMAL(15, 2) DEFAULT 0,
    min_transaction DECIMAL(15, 2) DEFAULT 0,
    quota INT DEFAULT 0,
    quota_used INT DEFAULT 0,
    locked_count INT DEFAULT 0,
    usage_limit_per_user INT DEFAULT 1,
    max_use_per_user INT DEFAULT 1,
    
    is_automatic BOOLEAN DEFAULT FALSE,
    is_stackable BOOLEAN DEFAULT FALSE,
    is_new_user_only BOOLEAN DEFAULT FALSE,
    applicable_to JSONB DEFAULT '["all"]',
    eligible_actions JSONB DEFAULT '["register"]',
    
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expired_at TIMESTAMP WITH TIME ZONE,
    start_date TIMESTAMP WITH TIME ZONE, -- for compatibility
    end_date TIMESTAMP WITH TIME ZONE, -- for compatibility
    valid_until TIMESTAMP WITH TIME ZONE, -- for compatibility
    
    priority INT DEFAULT 0,
    segment VARCHAR(50) DEFAULT 'all',
    is_active BOOLEAN DEFAULT TRUE,
    
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voucher_claims (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voucher_id INT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    invoice_id VARCHAR(100) REFERENCES invoices(id),
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'claimed', -- claimed, used, expired
    UNIQUE(user_id, voucher_id)
);

CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL,
    discount_value DECIMAL(15, 2) NOT NULL,
    min_purchase DECIMAL(15, 2) DEFAULT 0,
    quota INT DEFAULT 0,
    quota_used INT DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    invoice_id VARCHAR(100) NOT NULL,
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'converted', 'expired'))
);

-- ---------------------------------------------
-- 9. CONTENT, SUPPORT & REGIONS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(50) PRIMARY KEY,
    setting_value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- PROVINCE, REGENCY, DISTRICT, VILLAGE
    parent_id VARCHAR(50) REFERENCES regions(id) ON DELETE CASCADE
);

-- ---------------------------------------------
-- 10. AUDIT & LOGGING
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(100),
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domain_event_logs (
    id SERIAL PRIMARY KEY,
    domain_id INT REFERENCES domains(id) ON DELETE CASCADE,
    domain_name VARCHAR(255),
    event_type VARCHAR(100),
    old_status VARCHAR(50),
    new_status VARCHAR(50),
    message TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS email_logs (
    id SERIAL PRIMARY KEY,
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    template_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    message_id VARCHAR(255),
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------
-- 11. INDEXES
-- ---------------------------------------------
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_referral ON users(referral_code);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wt_wallet ON wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_domains_user_id ON domains(user_id);
CREATE INDEX IF NOT EXISTS idx_dns_domain ON dns_records(domain_id);
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_promo_events_activity ON promo_events (is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers (code);
CREATE INDEX IF NOT EXISTS idx_voucher_claims_user ON voucher_claims (user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_referrer ON referral_rewards (referrer_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_regions_type ON regions(type);
CREATE INDEX IF NOT EXISTS idx_regions_parent ON regions(parent_id);

-- =============================================
-- DATA SEEDING (SAMPEL DATA)
-- =============================================

-- 1. Default Referral Tiers
INSERT INTO referral_tiers (tier_name, min_referrals, reward_amount) VALUES
('Starter', 0, 20000),
('Silver', 5, 25000),
('Gold', 20, 35000)
ON CONFLICT DO NOTHING;

-- 2. TLD Pricing Data
INSERT INTO pricing (tld, cost_register, cost_renew, cost_transfer, cost_restore, price_register, price_renew, price_transfer, price_restore) VALUES
('.id', 200000, 200000, 200000, 1000000, 225000, 225000, 225000, 1200000),
('.com', 150000, 160000, 150000, 1200000, 185000, 195000, 185000, 1400000),
('.my.id', 11000, 11000, 11000, 50000, 15000, 15000, 15000, 75000),
('.biz.id', 11000, 11000, 11000, 50000, 15000, 15000, 15000, 75000)
ON CONFLICT (tld) DO NOTHING;

-- 3. Default Payment Gateways
INSERT INTO payment_gateways (bank_name, account_number, account_holder, provider, is_active, instructions) VALUES
('BCA', '1501548465', 'PT Domain Dagang', 'manual', true, 'Transfer manual ke rekening BCA'),
('Tripay', '0', 'SYSTEM', 'tripay', true, 'Pembayaran otomatis via Tripay')
ON CONFLICT DO NOTHING;

-- 4. Essential Site Settings
INSERT INTO site_settings (setting_key, setting_value) VALUES
('site_name', '"Domain Dagang"'),
('contact_email', '"support@domaindagang.com"'),
('referral_config', '{"referee_discount": 5000, "holding_period_days": 3}'),
('banned_referral_codes', '["admin", "official", "support", "dagang"]')
ON CONFLICT (setting_key) DO NOTHING;
