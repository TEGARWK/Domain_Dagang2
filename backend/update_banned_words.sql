-- ========================================================
-- UPDATE BANNED REFERRAL CODES
-- DESCRIPTION: Updates the list of forbidden words for custom referral codes.
-- ========================================================

-- 1. Ensure the setting exists and update it
INSERT INTO site_settings (setting_key, setting_value) 
VALUES ('banned_referral_codes', '["admin", "official", "support", "system", "owner", "staff", "mod", "moderator", "root", "superuser", "dagang", "domain", "billing", "payment", "host", "server", "verify", "email", "noreply", "webmaster", "security", "api", "dev", "devel", "kontol", "memek", "anjing", "bangsat", "babi", "goblok", "tolol", "idiot", "perek", "lonte", "jablay", "ngentot", "ngewe", "itil", "jembut", "asu", "bajingan", "brengsek", "tai", "setan", "pantek", "kimak", "pukimak", "titit", "pepek", "pecun", "pelacur", "bencong", "banci", "homo", "gay", "fuck", "shit", "ass", "bitch", "cunt", "dick", "pussy", "faggot", "bastard", "porn", "sex", "nude", "naked", "cheat", "scam", "hack", "phish", "spam"]')
ON CONFLICT (setting_key) 
DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW();

-- 2. Log activity (optional)
INSERT INTO activity_logs (invoice_id, action, description, user_type)
VALUES ('SYSTEM', 'BANNED_WORDS_UPDATE', 'Updated banned referral codes list (Anti-Profanity)', 'admin')
ON CONFLICT DO NOTHING; -- Assuming invoice_id FK doesn't block this for non-existent invoices or use a real dummy ID if needed
