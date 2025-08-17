-- Migração para corrigir a estrutura da tabela notification_settings
-- Data: 2025-01-16

-- Verificar se a tabela notification_settings existe e tem a estrutura correta
DO $$
BEGIN
    -- Se a tabela existe mas não tem a coluna user_id, vamos recriá-la
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notification_settings'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'user_id'
    ) THEN
        -- Remover a tabela existente
        DROP TABLE IF EXISTS notification_settings CASCADE;
        
        -- Recriar a tabela com a estrutura correta
        CREATE TABLE notification_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            
            -- Configurações de notificação
            new_appointments BOOLEAN DEFAULT true,
            appointment_reminders BOOLEAN DEFAULT true,
            payment_notifications BOOLEAN DEFAULT true,
            system_alerts BOOLEAN DEFAULT true,
            marketing_notifications BOOLEAN DEFAULT false,
            
            -- Configurações de horário
            quiet_hours_start TIME DEFAULT '22:00',
            quiet_hours_end TIME DEFAULT '08:00',
            timezone TEXT DEFAULT 'America/Sao_Paulo',
            
            -- Configurações de frequência
            max_notifications_per_day INTEGER DEFAULT 50,
            reminder_advance_hours INTEGER DEFAULT 24,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            -- Constraint único
            UNIQUE(tenant_id, user_id)
        );
        
        -- Criar índices
        CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant_id ON notification_settings(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);
        
        -- Habilitar RLS
        ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
        
        -- Criar políticas RLS
        CREATE POLICY "Users can view their own notification settings" ON notification_settings
            FOR SELECT USING (auth.uid() = user_id);
        
        CREATE POLICY "Users can insert their own notification settings" ON notification_settings
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        CREATE POLICY "Users can update their own notification settings" ON notification_settings
            FOR UPDATE USING (auth.uid() = user_id);
        
        -- Criar trigger para updated_at
        CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            
    END IF;
END $$;

-- Verificar e corrigir outras tabelas se necessário
DO $$
BEGIN
    -- Verificar se fcm_tokens existe
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'fcm_tokens'
    ) THEN
        CREATE TABLE fcm_tokens (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            device_info JSONB DEFAULT '{}',
            last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            
            UNIQUE(user_id, tenant_id)
        );
        
        CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
        CREATE INDEX IF NOT EXISTS idx_fcm_tokens_tenant_id ON fcm_tokens(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(is_active);
        CREATE INDEX IF NOT EXISTS idx_fcm_tokens_last_used ON fcm_tokens(last_used);
        
        ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own FCM tokens" ON fcm_tokens
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "Users can insert their own FCM tokens" ON fcm_tokens
            FOR INSERT WITH CHECK (auth.uid() = user_id);
        CREATE POLICY "Users can update their own FCM tokens" ON fcm_tokens
            FOR UPDATE USING (auth.uid() = user_id);
        CREATE POLICY "Users can delete their own FCM tokens" ON fcm_tokens
            FOR DELETE USING (auth.uid() = user_id);
            
        CREATE TRIGGER update_fcm_tokens_updated_at BEFORE UPDATE ON fcm_tokens
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verificar se notification_logs existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notification_logs'
    ) THEN
        CREATE TABLE notification_logs (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            token TEXT NOT NULL,
            notification_type TEXT NOT NULL DEFAULT 'general',
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            fcm_message_id TEXT,
            error TEXT,
            sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
            metadata JSONB DEFAULT '{}'
        );
        
        CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON notification_logs(user_id);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant_id ON notification_logs(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(notification_type);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);
        CREATE INDEX IF NOT EXISTS idx_notification_logs_fcm_message_id ON notification_logs(fcm_message_id);
        
        ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own notification logs" ON notification_logs
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "System can insert notification logs" ON notification_logs
            FOR INSERT WITH CHECK (true);
    END IF;
END $$;

-- Verificar se notification_templates existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notification_templates'
    ) THEN
        CREATE TABLE notification_templates (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            title_template TEXT NOT NULL,
            body_template TEXT NOT NULL,
            icon TEXT,
            badge TEXT,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant_id ON notification_templates(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
        CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active);
        
        ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Tenant admins can manage notification templates" ON notification_templates
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM tenants 
                    WHERE id = notification_templates.tenant_id 
                    AND owner_id = auth.uid()
                )
            );
            
        CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Verificar se scheduled_notifications existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scheduled_notifications'
    ) THEN
        CREATE TABLE scheduled_notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            template_id UUID REFERENCES notification_templates(id) ON DELETE SET NULL,
            
            title TEXT NOT NULL,
            body TEXT NOT NULL,
            icon TEXT,
            badge TEXT,
            data JSONB DEFAULT '{}',
            
            scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
            sent_at TIMESTAMP WITH TIME ZONE,
            status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
            
            priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high')),
            retry_count INTEGER DEFAULT 0,
            max_retries INTEGER DEFAULT 3,
            
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_tenant_id ON scheduled_notifications(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_user_id ON scheduled_notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_scheduled_for ON scheduled_notifications(scheduled_for);
        CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_status ON scheduled_notifications(status);
        CREATE INDEX IF NOT EXISTS idx_scheduled_notifications_pending ON scheduled_notifications(scheduled_for, status) WHERE status = 'pending';
        
        ALTER TABLE scheduled_notifications ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Users can view their own scheduled notifications" ON scheduled_notifications
            FOR SELECT USING (auth.uid() = user_id);
        CREATE POLICY "System can manage scheduled notifications" ON scheduled_notifications
            FOR ALL USING (true);
            
        CREATE TRIGGER update_scheduled_notifications_updated_at BEFORE UPDATE ON scheduled_notifications
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Garantir que a função update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Função para criar templates padrão para um tenant específico
CREATE OR REPLACE FUNCTION create_default_notification_templates(tenant_uuid UUID)
RETURNS VOID AS $$
BEGIN
    -- Inserir templates padrão para o tenant especificado
    INSERT INTO notification_templates (tenant_id, name, type, title_template, body_template, icon, badge)
    VALUES
        (tenant_uuid, 'Novo Agendamento', 'new_appointment', 'Novo agendamento: {customer_name}', 'Cliente {customer_name} agendou {service_name} para {appointment_date}', '/icons/calendar-shortcut.png', '/icons/calendar-shortcut.png'),
        (tenant_uuid, 'Lembrete de Agendamento', 'appointment_reminder', 'Lembrete: {service_name}', 'Você tem um agendamento com {customer_name} em {reminder_time}', '/icons/clock.png', '/icons/clock.png'),
        (tenant_uuid, 'Pagamento Recebido', 'payment_received', 'Pagamento recebido: {amount}', 'Pagamento de {amount} recebido para {service_name}', '/icons/payment.png', '/icons/payment.png'),
        (tenant_uuid, 'Alerta do Sistema', 'system_alert', 'Alerta: {alert_title}', '{alert_message}', '/icons/alert.png', '/icons/alert.png')
    ON CONFLICT (tenant_id, type) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
