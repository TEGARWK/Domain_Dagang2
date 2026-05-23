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
    district VARCHAR(255),
    village VARCHAR(255),
    zip VARCHAR(50),
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
    referee_discount_used BOOLEAN DEFAULT FALSE,
    
    -- Registrar Handle
    registrar_customer_id VARCHAR(100),

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
    registration_attempt_count INT DEFAULT 0,
    registered_at TIMESTAMP,
    whois_privacy BOOLEAN DEFAULT FALSE,
    registrar_error_log TEXT,
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
    applied_promo_snapshot JSONB,
    original_subtotal DECIMAL(15, 2),
    discount_amount DECIMAL(15, 2) DEFAULT 0,
    discount_source VARCHAR(50),
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

CREATE TABLE IF NOT EXISTS transfer_requests (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain_name VARCHAR(255) NOT NULL,
    auth_code VARCHAR(255),
    epp_code VARCHAR(255) NOT NULL,
    current_registrar VARCHAR(100),
    status VARCHAR(50) DEFAULT 'PENDING_PAYMENT',
    invoice_id VARCHAR(100) REFERENCES invoices(id) ON DELETE SET NULL,
    registrar_transfer_id VARCHAR(100),
    failure_reason TEXT,
    admin_notes TEXT,
    last_check_at TIMESTAMP WITH TIME ZONE,
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
    transaction_type VARCHAR(50) DEFAULT 'DOMAIN',
    payment_proof TEXT,
    proof_uploaded_at TIMESTAMP WITH TIME ZONE,

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
    
    gateway_type VARCHAR(50) DEFAULT 'bank',
    qris_url TEXT,
    frontend_callback TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prismalink_channels (
    id SERIAL,
    bank_id VARCHAR(50) PRIMARY KEY,
    bank_name VARCHAR(255) NOT NULL,
    method VARCHAR(50) DEFAULT 'VA',
    logo_url VARCHAR(255),
    is_custom BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
-- 6b. PURE REVENUE FINANCE (V2)
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS finance_periods (
    id SERIAL PRIMARY KEY,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    omset NUMERIC(15, 2) DEFAULT 0,
    data_saving_total NUMERIC(15, 2) DEFAULT 0,
    net_profit NUMERIC(15, 2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(month, year)
);

CREATE TABLE IF NOT EXISTS finance_configs (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES finance_periods(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('SAVING', 'DISTRIBUTION')),
    name VARCHAR(100) NOT NULL,
    percentage NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_money_locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    balance NUMERIC(15, 2) DEFAULT 0,
    is_main BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_profit_holders (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    current_month_right NUMERIC(15, 2) DEFAULT 0,
    total_taken NUMERIC(15, 2) DEFAULT 0,
    balance NUMERIC(15, 2) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance_internal_mutations (
    id SERIAL PRIMARY KEY,
    period_id INTEGER REFERENCES finance_periods(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('IN', 'OUT', 'TRANSFER')),
    category VARCHAR(50) NOT NULL CHECK (category IN ('SAVING', 'PROFIT_SHARE', 'AVAILABLE_MONEY', 'REVENUE', 'DEPOSIT', 'OTHER')),
    location_id INTEGER REFERENCES finance_money_locations(id) ON DELETE CASCADE,
    target_location_id INTEGER REFERENCES finance_money_locations(id) ON DELETE CASCADE,
    nominal NUMERIC(15, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
    reward_tier INT DEFAULT 1,
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
    
    -- Compatibility Alias Columns for CouponService & PromoEngine
    type VARCHAR(20) CHECK (type IN ('fixed', 'percentage')),
    value DECIMAL(15, 2) DEFAULT 0,
    min_purchase DECIMAL(15, 2) DEFAULT 0,
    usage_limit INT DEFAULT 0,
    usage_limit_total INT DEFAULT 0,
    used_count INT DEFAULT 0,
    
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
    title VARCHAR(255),
    subtitle VARCHAR(255),
    description TEXT,
    banner_image TEXT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('fixed', 'percentage')),
    value DECIMAL(15, 2) NOT NULL DEFAULT 0,
    max_discount DECIMAL(15, 2) DEFAULT 0,
    min_purchase DECIMAL(15, 2) DEFAULT 0,
    usage_limit INT DEFAULT 0,
    usage_limit_total INT DEFAULT 0,
    used_count INT DEFAULT 0,
    is_automatic BOOLEAN DEFAULT FALSE,
    valid_until TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    eligible_tlds JSONB DEFAULT '[]',
    eligible_actions JSONB DEFAULT '["register"]',
    is_stackable BOOLEAN DEFAULT FALSE,
    is_new_user_only BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    usage_limit_per_user INT DEFAULT 1,
    priority INT DEFAULT 0,
    segment VARCHAR(50) DEFAULT 'all',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coupon_id INT REFERENCES vouchers(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    invoice_id VARCHAR(100) NOT NULL,
    reserved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'LOCKED' CHECK (status IN ('LOCKED', 'USED', 'EXPIRED', 'CANCELLED'))
);

CREATE TABLE IF NOT EXISTS user_vouchers (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INT REFERENCES coupons(id) ON DELETE CASCADE,
    claimed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    used_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'claimed',
    UNIQUE(user_id, coupon_id)
);

-- ---------------------------------------------
-- 9. CONTENT, SUPPORT & REGIONS
-- ---------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT,
    setting_group VARCHAR(50) DEFAULT 'general',
    label VARCHAR(255),
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    type VARCHAR(50),
    reference_id VARCHAR(255),
    reference_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(50) DEFAULT 'Umum',
    is_active BOOLEAN DEFAULT TRUE,
    order_num INT DEFAULT 0,
    priority INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'medium',
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_replies (
    id SERIAL PRIMARY KEY,
    ticket_id INT NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_replies_ticket ON ticket_replies(ticket_id);

CREATE TABLE IF NOT EXISTS regions (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- PROVINCE, REGENCY, DISTRICT, VILLAGE
    parent_id VARCHAR(50) REFERENCES regions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    old_value TEXT,
    new_value TEXT,
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
    from_status VARCHAR(50),
    old_value TEXT,
    new_value TEXT,
    performed_by INT REFERENCES users(id) ON DELETE SET NULL,
    to_status VARCHAR(50),
    reason TEXT,
    api_raw_response JSONB,
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
CREATE INDEX IF NOT EXISTS idx_finance_mutations_period ON finance_internal_mutations(period_id);
CREATE INDEX IF NOT EXISTS idx_finance_configs_period ON finance_configs(period_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_user ON transfer_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_invoice ON transfer_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_coupon_reservations_expiry ON coupon_reservations (expires_at) WHERE status = 'LOCKED';
CREATE INDEX IF NOT EXISTS idx_coupon_reservations_invoice ON coupon_reservations (invoice_id);
CREATE INDEX IF NOT EXISTS idx_prismalink_active ON prismalink_channels(is_active);

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

-- 4. Essential Site Settings & Default Footer
INSERT INTO site_settings (setting_key, setting_value, setting_group, label) VALUES
('site_name', 'Domain Dagang', 'general', 'Nama Website'),
('contact_email', 'support@domaindagang.com', 'general', 'Email Kontak'),
('referral_config', '{"referee_discount": 5000, "holding_period_days": 3}', 'general', 'Konfigurasi Referral'),
('banned_referral_codes', '["admin", "official", "support", "dagang"]', 'general', 'Banned Referral Codes'),
('footer_company_name', 'PT. Aplikasi Dagang Teknologi', 'footer', 'Nama Perusahaan'),
('footer_address', 'Jl. Cigadung Raya Tengah No.52, RT.2, Cigadung, Kec. Cibeunying Kaler, Kota Bandung, Jawa Barat 40191', 'footer', 'Alamat Kantor'),
('footer_support_email', 'support@domaindagang.com', 'footer', 'Email Support (Internal)'),
('footer_whatsapp', '081384868040', 'footer', 'WhatsApp CS (Internal)'),
('footer_copyright', '© 2026 PT. Aplikasi Dagang Teknologi. All rights reserved.', 'footer', 'Teks Copyright'),
('footer_instagram', 'https://instagram.com/Jasaweb_pro', 'social', 'Instagram URL'),
('footer_youtube', 'https://youtube.com/@aplikasidagang', 'social', 'YouTube URL'),
('footer_facebook', 'https://facebook.com/aplikasidagang', 'social', 'Facebook URL'),
('footer_tiktok', 'https://tiktok.com/@aplikasidagang', 'social', 'TikTok URL'),
('footer_x', 'https://x.com/aplikasidagang', 'social', 'X (Twitter) URL')
ON CONFLICT (setting_key) DO NOTHING;

-- 5. Default Admin User
INSERT INTO users (name, email, password, role, is_verified) VALUES
('Tegar Admin', 'tegar@aplikasidagang.com', '$2b$10$jnJfUPzC1lkpferL8kR/0OKpyPpqSCQx.EBrR12RzU2VIE9AthXpq', 'admin', true)
ON CONFLICT (email) DO NOTHING;

