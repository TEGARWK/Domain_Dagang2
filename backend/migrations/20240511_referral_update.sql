-- Add reward_tier to referral_rewards to distinguish between direct (1) and indirect (2) rewards
ALTER TABLE referral_rewards ADD COLUMN IF NOT EXISTS reward_tier INT DEFAULT 1;

-- Ensure referral_config exists in site_settings with default percentages if not already there
INSERT INTO site_settings (setting_key, setting_value)
VALUES ('referral_config', '{"referee_discount": 5000, "holding_period_days": 3, "commission_tier_1_percent": 20, "commission_tier_2_percent": 10}')
ON CONFLICT (setting_key) DO NOTHING;
