-- Corrigir constraint de tipo na tabela notifications
-- Criado em: 2025-01-16

-- ======================================
-- 1. VERIFICAR E CORRIGIR CONSTRAINT DE TIPO
-- ======================================

-- Remover constraint existente se existir
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'notifications_type_check'
    ) THEN
        ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
    END IF;
END $$;

-- Criar nova constraint com todos os tipos necessários
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'appointment_created',
    'appointment_updated', 
    'appointment_cancelled',
    'appointment_completed',
    'payment_received',
    'system_alert',
    'appointment_reminder',
    'appointment_confirmation',
    'customer_feedback',
    'service_update',
    'professional_availability',
    'business_hours_change',
    'subscription_expiry',
    'payment_failed',
    'backup_completed',
    'maintenance_notice'
));

-- ======================================
-- 2. VERIFICAR E CORRIGIR FUNÇÕES DE TRIGGER
-- ======================================

-- Recriar função notify_appointment_created com tipo correto
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
            false, -- não é importante
            NOW() + INTERVAL '7 days' -- expira em 7 dias
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Recriar função notify_appointment_updated com tipo correto
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

-- Recriar função notify_appointment_cancelled com tipo correto
CREATE OR REPLACE FUNCTION notify_appointment_cancelled()
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
BEGIN
    -- Só notificar se foi cancelado
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
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
            AND appointment_cancelled = true
        ) THEN
            -- Criar notificação
            PERFORM create_notification(
                NEW.tenant_id,
                'appointment_cancelled',
                'Agendamento Cancelado',
                format(
                    'Agendamento de %s para %s com %s foi cancelado',
                    v_customer_name,
                    v_service_name,
                    v_professional_name
                ),
                jsonb_build_object(
                    'appointment_id', NEW.id,
                    'customer_name', v_customer_name,
                    'service_name', v_service_name,
                    'professional_name', v_professional_name,
                    'appointment_date', v_appointment_date,
                    'appointment_time', v_appointment_time
                ),
                true, -- é importante
                NOW() + INTERVAL '7 days'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- ======================================
-- 3. RECRIAR TRIGGERS
-- ======================================

-- Recriar triggers
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

DROP TRIGGER IF EXISTS trigger_notify_appointment_cancelled ON appointments;
CREATE TRIGGER trigger_notify_appointment_cancelled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_cancelled();

-- ======================================
-- 4. CONCEDER PERMISSÕES
-- ======================================

GRANT EXECUTE ON FUNCTION notify_appointment_created TO service_role;
GRANT EXECUTE ON FUNCTION notify_appointment_updated TO service_role;
GRANT EXECUTE ON FUNCTION notify_appointment_cancelled TO service_role;

-- ======================================
-- 5. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'CONSTRAINT DE TIPO CORRIGIDA:';
    RAISE NOTICE '- Constraint notifications_type_check recriada com tipos expandidos';
    RAISE NOTICE '- Funções de trigger recriadas com COALESCE para valores nulos';
    RAISE NOTICE '- Triggers recriados';
    RAISE NOTICE '- Permissões concedidas';
END $$;
