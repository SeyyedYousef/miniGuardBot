-- ============================================================================
-- MiniGuard (@MiniGuardBot) — Production PostgreSQL Schema (2026)
-- Architecture: 1 Dedicated Bot = 1 Dedicated Group (Strict Isolation)
-- Monetization: 24-Hour Free Trial -> 100 Telegram Stars (XTR) / Month
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Telegram Users & Notification Preferences
CREATE TABLE IF NOT EXISTS users (
    telegram_id BIGINT PRIMARY KEY,
    username VARCHAR(64),
    first_name VARCHAR(128) NOT NULL,
    last_name VARCHAR(128),
    language_code VARCHAR(8) NOT NULL DEFAULT 'fa',
    daily_pm_report_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    threat_alerts_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Managed Bots (Created via @BotFather, 1 Bot = 1 Group)
CREATE TABLE IF NOT EXISTS managed_bots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    bot_id BIGINT NOT NULL UNIQUE,
    bot_username VARCHAR(64) NOT NULL UNIQUE,
    bot_name VARCHAR(128) NOT NULL,
    -- AES-256-GCM encrypted BotFather token (iv:authTag:ciphertext)
    encrypted_token TEXT NOT NULL,
    webhook_secret VARCHAR(128) NOT NULL,
    target_group_link VARCHAR(255) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'revoked')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Managed Groups (Strictly 1 Group per Bot via UNIQUE(bot_id))
CREATE TABLE IF NOT EXISTS managed_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id UUID NOT NULL UNIQUE REFERENCES managed_bots(id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    telegram_chat_id BIGINT UNIQUE,
    group_link VARCHAR(255) NOT NULL,
    chat_title VARCHAR(255) NOT NULL,
    chat_type VARCHAR(32) NOT NULL DEFAULT 'supergroup',
    members_count INTEGER NOT NULL DEFAULT 1,
    -- Subscription: 24-Hour Free Trial, then 100 Telegram Stars (XTR) / 30 Days
    subscription_status VARCHAR(16) NOT NULL DEFAULT 'trial'
        CHECK (subscription_status IN ('trial', 'paid', 'expired', 'cancelled')),
    trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
    paid_until TIMESTAMPTZ,
    notif_6h_sent BOOLEAN NOT NULL DEFAULT FALSE,
    notif_1h_sent BOOLEAN NOT NULL DEFAULT FALSE,
    notif_expired_sent BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Per-Group Firewall & Moderation Settings (Optimistic Concurrency via version)
CREATE TABLE IF NOT EXISTS group_settings (
    group_id UUID PRIMARY KEY REFERENCES managed_groups(id) ON DELETE CASCADE,
    general JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_restrictions JSONB NOT NULL DEFAULT '{}'::jsonb,
    limits JSONB NOT NULL DEFAULT '{}'::jsonb,
    quiet_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
    mandatory_membership JSONB NOT NULL DEFAULT '{}'::jsonb,
    custom_texts JSONB NOT NULL DEFAULT '{}'::jsonb,
    dynamic_bio JSONB NOT NULL DEFAULT '{}'::jsonb,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Telegram Stars (XTR) Subscription Ledger (100 Stars / Month)
CREATE TABLE IF NOT EXISTS star_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES managed_groups(id) ON DELETE CASCADE,
    payer_user_id BIGINT NOT NULL REFERENCES users(telegram_id),
    telegram_payment_charge_id VARCHAR(255) NOT NULL UNIQUE,
    stars_amount INTEGER NOT NULL DEFAULT 100,
    period_days INTEGER NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Daily Group Analytics Rollups (Used for Charts & Nightly @MiniGuardBot PM Report)
CREATE TABLE IF NOT EXISTS group_daily_metrics (
    group_id UUID NOT NULL REFERENCES managed_groups(id) ON DELETE CASCADE,
    metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_count INTEGER NOT NULL DEFAULT 0,
    active_users INTEGER NOT NULL DEFAULT 0,
    new_members INTEGER NOT NULL DEFAULT 0,
    left_members INTEGER NOT NULL DEFAULT 0,
    spam_blocked INTEGER NOT NULL DEFAULT 0,
    warnings_issued INTEGER NOT NULL DEFAULT 0,
    bans_issued INTEGER NOT NULL DEFAULT 0,
    join_requests_approved INTEGER NOT NULL DEFAULT 0,
    join_requests_declined INTEGER NOT NULL DEFAULT 0,
    violation_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    hourly_activity JSONB NOT NULL DEFAULT '[]'::jsonb,
    topic_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
    PRIMARY KEY (group_id, metric_date)
);

-- 7. Security & Threat Notifications Audit Log
CREATE TABLE IF NOT EXISTS security_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES managed_groups(id) ON DELETE CASCADE,
    owner_user_id BIGINT NOT NULL REFERENCES users(telegram_id) ON DELETE CASCADE,
    threat_type VARCHAR(64) NOT NULL,
    severity VARCHAR(16) NOT NULL DEFAULT 'high',
    summary TEXT NOT NULL,
    delivered_to_pm BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_managed_groups_sub_expiry
    ON managed_groups (subscription_status, trial_ends_at, paid_until);

