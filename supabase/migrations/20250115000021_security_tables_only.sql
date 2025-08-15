-- Create security-related tables for the SaaS application

-- Security Events Table
CREATE TABLE IF NOT EXISTS security_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('ddos', 'brute_force', 'suspicious_activity', 'rate_limit', 'blocked_ip')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Stats Table
CREATE TABLE IF NOT EXISTS security_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    total_events INTEGER DEFAULT 0,
    blocked_ips INTEGER DEFAULT 0,
    rate_limit_hits INTEGER DEFAULT 0,
    ddos_attempts INTEGER DEFAULT 0,
    suspicious_activities INTEGER DEFAULT 0,
    last_24_hours INTEGER DEFAULT 0,
    security_score INTEGER DEFAULT 100 CHECK (security_score >= 0 AND security_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Config Table
CREATE TABLE IF NOT EXISTS security_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    rate_limit_enabled BOOLEAN DEFAULT TRUE,
    requests_per_minute INTEGER DEFAULT 60,
    requests_per_hour INTEGER DEFAULT 1000,
    requests_per_day INTEGER DEFAULT 10000,
    block_duration INTEGER DEFAULT 15, -- minutes
    ddos_protection BOOLEAN DEFAULT TRUE,
    brute_force_protection BOOLEAN DEFAULT TRUE,
    geo_blocking BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Two Factor Authentication Table
CREATE TABLE IF NOT EXISTS user_two_factor (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    method_type TEXT NOT NULL CHECK (method_type IN ('sms', 'email', 'authenticator')),
    enabled BOOLEAN DEFAULT FALSE,
    verified BOOLEAN DEFAULT FALSE,
    secret_key TEXT, -- For authenticator apps
    phone_number TEXT, -- For SMS
    email TEXT, -- For email
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, method_type)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_events_tenant_id ON security_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_events_timestamp ON security_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_security_events_type ON security_events(type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_resolved ON security_events(resolved);

CREATE INDEX IF NOT EXISTS idx_user_two_factor_user_id ON user_two_factor(user_id);
CREATE INDEX IF NOT EXISTS idx_user_two_factor_method_type ON user_two_factor(method_type);

-- Create RLS policies
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_two_factor ENABLE ROW LEVEL SECURITY;

-- Security Events policies
CREATE POLICY "Users can view security events for their tenant" ON security_events
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update security events for their tenant" ON security_events
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert security events for their tenant" ON security_events
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Security Stats policies
CREATE POLICY "Users can view security stats for their tenant" ON security_stats
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update security stats for their tenant" ON security_stats
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert security stats for their tenant" ON security_stats
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Security Config policies
CREATE POLICY "Users can view security config for their tenant" ON security_config
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update security config for their tenant" ON security_config
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert security config for their tenant" ON security_config
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- User Two Factor policies
CREATE POLICY "Users can view their own 2FA settings" ON user_two_factor
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own 2FA settings" ON user_two_factor
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own 2FA settings" ON user_two_factor
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create functions to automatically create security config and stats for new tenants
CREATE OR REPLACE FUNCTION create_tenant_security_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Create security config for new tenant
    INSERT INTO security_config (tenant_id) VALUES (NEW.id);
    
    -- Create security stats for new tenant
    INSERT INTO security_stats (tenant_id) VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create security records for new tenants
CREATE TRIGGER trigger_create_tenant_security_records
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_tenant_security_records();

-- Create function to update security stats
CREATE OR REPLACE FUNCTION update_security_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update security stats when a new event is created
    INSERT INTO security_stats (tenant_id, total_events, last_24_hours)
    VALUES (NEW.tenant_id, 1, 1)
    ON CONFLICT (tenant_id) DO UPDATE SET
        total_events = security_stats.total_events + 1,
        last_24_hours = security_stats.last_24_hours + 1,
        updated_at = NOW();
    
    -- Update specific counters based on event type
    CASE NEW.type
        WHEN 'ddos' THEN
            UPDATE security_stats 
            SET ddos_attempts = ddos_attempts + 1, updated_at = NOW()
            WHERE tenant_id = NEW.tenant_id;
        WHEN 'rate_limit' THEN
            UPDATE security_stats 
            SET rate_limit_hits = rate_limit_hits + 1, updated_at = NOW()
            WHERE tenant_id = NEW.tenant_id;
        WHEN 'blocked_ip' THEN
            UPDATE security_stats 
            SET blocked_ips = blocked_ips + 1, updated_at = NOW()
            WHERE tenant_id = NEW.tenant_id;
        WHEN 'suspicious_activity' THEN
            UPDATE security_stats 
            SET suspicious_activities = suspicious_activities + 1, updated_at = NOW()
            WHERE tenant_id = NEW.tenant_id;
    END CASE;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update security stats when events are created
CREATE TRIGGER trigger_update_security_stats
    AFTER INSERT ON security_events
    FOR EACH ROW
    EXECUTE FUNCTION update_security_stats();
