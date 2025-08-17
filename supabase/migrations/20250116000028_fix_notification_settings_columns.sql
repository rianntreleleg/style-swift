-- Migração para corrigir as colunas da tabela notification_settings
-- Data: 2025-01-16

-- Verificar e adicionar colunas que estão faltando na tabela notification_settings
DO $$
BEGIN
    -- Adicionar coluna appointment_created se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_created'
    ) THEN
        ALTER TABLE notification_settings ADD COLUMN appointment_created BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar coluna appointment_updated se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_updated'
    ) THEN
        ALTER TABLE notification_settings ADD COLUMN appointment_updated BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar coluna appointment_cancelled se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_cancelled'
    ) THEN
        ALTER TABLE notification_settings ADD COLUMN appointment_cancelled BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar coluna appointment_completed se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_completed'
    ) THEN
        ALTER TABLE notification_settings ADD COLUMN appointment_completed BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar coluna payment_received se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'payment_received'
    ) THEN
        ALTER TABLE notification_settings ADD COLUMN payment_received BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar coluna email_notifications se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'email_notifications'
    ) THEN
        ALTER TABLE notification_settings ADD COLUMN email_notifications BOOLEAN DEFAULT true;
    END IF;
    
    -- Adicionar coluna push_notifications se não existir
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'push_notifications'
    ) THEN
        ALTER TABLE notification_settings ADD COLUMN push_notifications BOOLEAN DEFAULT true;
    END IF;
    
    -- Renomear colunas se necessário para manter compatibilidade
    -- Se new_appointments existe mas appointment_created não, renomear
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'new_appointments'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_created'
    ) THEN
        ALTER TABLE notification_settings RENAME COLUMN new_appointments TO appointment_created;
    END IF;
    
    -- Se appointment_reminders existe mas appointment_updated não, renomear
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_reminders'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_updated'
    ) THEN
        ALTER TABLE notification_settings RENAME COLUMN appointment_reminders TO appointment_updated;
    END IF;
    
    -- Se payment_notifications existe mas payment_received não, renomear
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'payment_notifications'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'payment_received'
    ) THEN
        ALTER TABLE notification_settings RENAME COLUMN payment_notifications TO payment_received;
    END IF;
    
    -- Se marketing_notifications existe mas appointment_cancelled não, renomear
    IF EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'marketing_notifications'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'notification_settings' 
        AND column_name = 'appointment_cancelled'
    ) THEN
        ALTER TABLE notification_settings RENAME COLUMN marketing_notifications TO appointment_cancelled;
    END IF;
    
END $$;

-- Verificar se a tabela notifications existe e tem a estrutura correta
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'notifications'
    ) THEN
        CREATE TABLE notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            type TEXT NOT NULL CHECK (type IN ('appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_completed', 'payment_received', 'system_alert')),
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            data JSONB DEFAULT '{}',
            is_important BOOLEAN DEFAULT false,
            is_read BOOLEAN DEFAULT false,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE
        );
        
        CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
        CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
        CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, is_read) WHERE is_read = false;
        
        ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
        
        CREATE POLICY "Tenant users can view their notifications" ON notifications
            FOR SELECT USING (
                tenant_id IN (
                    SELECT id FROM tenants WHERE owner_id = auth.uid()
                )
            );
        
        CREATE POLICY "System can manage notifications" ON notifications
            FOR ALL USING (true);
    END IF;
END $$;

-- Garantir que a função create_notification existe
CREATE OR REPLACE FUNCTION create_notification(
    p_tenant_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_is_important BOOLEAN DEFAULT false,
    p_expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_owner_id UUID;
BEGIN
    -- Buscar owner_id do tenant
    SELECT owner_id INTO v_owner_id
    FROM tenants
    WHERE id = p_tenant_id;
    
    -- Verificar se o tenant existe
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Tenant não encontrado';
    END IF;
    
    -- Inserir notificação
    INSERT INTO notifications (
        tenant_id,
        user_id,
        type,
        title,
        message,
        data,
        is_important,
        expires_at
    ) VALUES (
        p_tenant_id,
        v_owner_id,
        p_type,
        p_title,
        p_message,
        p_data,
        p_is_important,
        p_expires_at
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- Garantir que as funções de trigger existem
CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_name TEXT;
    v_service_name TEXT;
    v_professional_name TEXT;
    v_appointment_date TEXT;
    v_appointment_time TEXT;
    v_notification_title TEXT;
    v_notification_message TEXT;
BEGIN
    -- Buscar dados do agendamento
    SELECT 
        COALESCE(c.name, 'Cliente'),
        COALESCE(s.name, 'Serviço'),
        COALESCE(p.name, 'Profissional'),
        TO_CHAR(a.start_time, 'DD/MM/YYYY'),
        TO_CHAR(a.start_time, 'HH24:MI')
    INTO v_customer_name, v_service_name, v_professional_name, v_appointment_date, v_appointment_time
    FROM appointments a
    LEFT JOIN customers c ON a.customer_id = c.id
    LEFT JOIN services s ON a.service_id = s.id
    LEFT JOIN professionals p ON a.professional_id = p.id
    WHERE a.id = NEW.id;
    
    -- Verificar se as notificações estão habilitadas para este tenant
    IF EXISTS (
        SELECT 1 FROM notification_settings 
        WHERE tenant_id = NEW.tenant_id 
        AND appointment_created = true
    ) THEN
        -- Criar título e mensagem
        v_notification_title := 'Novo Agendamento';
        v_notification_message := format(
            'Cliente %s agendou %s com %s para %s às %s',
            v_customer_name,
            v_service_name,
            v_professional_name,
            v_appointment_date,
            v_appointment_time
        );
        
        -- Criar notificação
        PERFORM create_notification(
            NEW.tenant_id,
            'appointment_created',
            v_notification_title,
            v_notification_message,
            jsonb_build_object(
                'appointment_id', NEW.id,
                'customer_name', v_customer_name,
                'service_name', v_service_name,
                'professional_name', v_professional_name,
                'appointment_date', v_appointment_date,
                'appointment_time', v_appointment_time
            ),
            false,
            NOW() + INTERVAL '7 days'
        );
    END IF;
    
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION notify_appointment_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_name TEXT;
    v_service_name TEXT;
    v_professional_name TEXT;
    v_appointment_date TEXT;
    v_appointment_time TEXT;
    v_notification_title TEXT;
    v_notification_message TEXT;
BEGIN
    -- Só notificar se houve mudança significativa
    IF OLD.start_time != NEW.start_time OR OLD.status != NEW.status THEN
        -- Buscar dados do agendamento
        SELECT 
            COALESCE(c.name, 'Cliente'),
            COALESCE(s.name, 'Serviço'),
            COALESCE(p.name, 'Profissional'),
            TO_CHAR(a.start_time, 'DD/MM/YYYY'),
            TO_CHAR(a.start_time, 'HH24:MI')
        INTO v_customer_name, v_service_name, v_professional_name, v_appointment_date, v_appointment_time
        FROM appointments a
        LEFT JOIN customers c ON a.customer_id = c.id
        LEFT JOIN services s ON a.service_id = s.id
        LEFT JOIN professionals p ON a.professional_id = p.id
        WHERE a.id = NEW.id;
        
        -- Verificar se as notificações estão habilitadas
        IF EXISTS (
            SELECT 1 FROM notification_settings 
            WHERE tenant_id = NEW.tenant_id 
            AND appointment_updated = true
        ) THEN
            -- Criar título e mensagem baseado na mudança
            IF OLD.status != NEW.status THEN
                v_notification_title := 'Status do Agendamento Alterado';
                v_notification_message := format(
                    'Agendamento de %s foi alterado para: %s',
                    v_customer_name,
                    NEW.status
                );
            ELSE
                v_notification_title := 'Agendamento Reagendado';
                v_notification_message := format(
                    'Agendamento de %s foi reagendado para %s às %s',
                    v_customer_name,
                    v_appointment_date,
                    v_appointment_time
                );
            END IF;
            
            -- Criar notificação
            PERFORM create_notification(
                NEW.tenant_id,
                'appointment_updated',
                v_notification_title,
                v_notification_message,
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'customer_name', v_customer_name,
                    'old_status', OLD.status,
                    'new_status', NEW.status,
                    'old_start_time', OLD.start_time,
                    'new_start_time', NEW.start_time
                ),
                false,
                NOW() + INTERVAL '7 days'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Garantir que os triggers existem
DROP TRIGGER IF EXISTS trigger_notify_appointment_created ON appointments;
CREATE TRIGGER trigger_notify_appointment_created
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_created();

DROP TRIGGER IF EXISTS trigger_notify_appointment_updated ON appointments;
CREATE TRIGGER trigger_notify_appointment_updated
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_updated();

-- Conceder permissões
GRANT EXECUTE ON FUNCTION create_notification TO service_role;
GRANT EXECUTE ON FUNCTION notify_appointment_created TO service_role;
GRANT EXECUTE ON FUNCTION notify_appointment_updated TO service_role;
