-- Create additional tables for complete system functionality

-- Backups Table
CREATE TABLE IF NOT EXISTS backups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    backup_type TEXT NOT NULL CHECK (backup_type IN ('full', 'incremental', 'differential')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
    file_path TEXT,
    file_size BIGINT,
    compression_ratio DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    retention_days INTEGER DEFAULT 30
);

-- Backup Stats Table
CREATE TABLE IF NOT EXISTS backup_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    total_backups INTEGER DEFAULT 0,
    successful_backups INTEGER DEFAULT 0,
    failed_backups INTEGER DEFAULT 0,
    total_size BIGINT DEFAULT 0,
    last_backup_at TIMESTAMPTZ,
    next_scheduled_backup TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Metrics Table
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('cpu', 'memory', 'disk', 'network', 'database', 'api')),
    metric_name TEXT NOT NULL,
    metric_value DECIMAL(10,4) NOT NULL,
    unit TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Alerts Table
CREATE TABLE IF NOT EXISTS system_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('performance', 'security', 'backup', 'system', 'maintenance')),
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
    acknowledged_by UUID REFERENCES auth.users(id),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Health Table
CREATE TABLE IF NOT EXISTS system_health (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    overall_status TEXT NOT NULL DEFAULT 'healthy' CHECK (overall_status IN ('healthy', 'warning', 'critical', 'maintenance')),
    uptime_percentage DECIMAL(5,2) DEFAULT 100.00,
    last_check_at TIMESTAMPTZ DEFAULT NOW(),
    next_check_at TIMESTAMPTZ,
    health_score INTEGER DEFAULT 100 CHECK (health_score >= 0 AND health_score <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backups_tenant_id ON backups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_backups_status ON backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);

CREATE INDEX IF NOT EXISTS idx_system_metrics_tenant_id ON system_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(timestamp);

CREATE INDEX IF NOT EXISTS idx_system_alerts_tenant_id ON system_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_alerts_status ON system_alerts(status);
CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);

-- Create RLS policies
ALTER TABLE backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE backup_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_health ENABLE ROW LEVEL SECURITY;

-- Backups policies
CREATE POLICY "Users can view backups for their tenant" ON backups
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert backups for their tenant" ON backups
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update backups for their tenant" ON backups
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Backup Stats policies
CREATE POLICY "Users can view backup stats for their tenant" ON backup_stats
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update backup stats for their tenant" ON backup_stats
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert backup stats for their tenant" ON backup_stats
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- System Metrics policies
CREATE POLICY "Users can view system metrics for their tenant" ON system_metrics
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert system metrics for their tenant" ON system_metrics
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- System Alerts policies
CREATE POLICY "Users can view system alerts for their tenant" ON system_alerts
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update system alerts for their tenant" ON system_alerts
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert system alerts for their tenant" ON system_alerts
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- System Health policies
CREATE POLICY "Users can view system health for their tenant" ON system_health
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can update system health for their tenant" ON system_health
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert system health for their tenant" ON system_health
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Create functions to automatically create additional records for new tenants
CREATE OR REPLACE FUNCTION create_tenant_additional_records()
RETURNS TRIGGER AS $$
BEGIN
    -- Create backup stats for new tenant
    INSERT INTO backup_stats (tenant_id) VALUES (NEW.id);
    
    -- Create system health record for new tenant
    INSERT INTO system_health (tenant_id) VALUES (NEW.id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create additional records for new tenants
CREATE TRIGGER trigger_create_tenant_additional_records
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_tenant_additional_records();

-- Create function to update backup stats
CREATE OR REPLACE FUNCTION update_backup_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update backup stats when a new backup is created
    INSERT INTO backup_stats (tenant_id, total_backups, successful_backups, total_size)
    VALUES (NEW.tenant_id, 1, CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END, NEW.file_size)
    ON CONFLICT (tenant_id) DO UPDATE SET
        total_backups = backup_stats.total_backups + 1,
        successful_backups = backup_stats.successful_backups + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
        total_size = backup_stats.total_size + COALESCE(NEW.file_size, 0),
        last_backup_at = CASE WHEN NEW.status = 'completed' THEN NEW.completed_at ELSE backup_stats.last_backup_at END,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update backup stats when backups are created
CREATE TRIGGER trigger_update_backup_stats
    AFTER INSERT ON backups
    FOR EACH ROW
    EXECUTE FUNCTION update_backup_stats();
