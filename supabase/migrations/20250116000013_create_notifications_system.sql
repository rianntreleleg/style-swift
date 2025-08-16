-- Sistema de Notificações para Agendamentos
-- Criado em: 2025-01-16

-- ======================================
-- 1. TABELA DE NOTIFICAÇÕES
-- ======================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_completed', 'payment_received', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);

-- ======================================
-- 2. TABELA DE CONFIGURAÇÕES DE NOTIFICAÇÃO
-- ======================================

CREATE TABLE IF NOT EXISTS notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    appointment_created BOOLEAN DEFAULT true,
    appointment_updated BOOLEAN DEFAULT true,
    appointment_cancelled BOOLEAN DEFAULT true,
    appointment_completed BOOLEAN DEFAULT true,
    payment_received BOOLEAN DEFAULT true,
    system_alerts BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ======================================
-- 3. ÍNDICES PARA PERFORMANCE (SERÃO CRIADOS NA PRÓXIMA MIGRAÇÃO)
-- ======================================

-- Os índices serão criados na migração de correção da estrutura

-- ======================================
-- 4. RLS (Row Level Security)
-- ======================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para notifications
CREATE POLICY "Tenant users can view their notifications" ON notifications
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage notifications" ON notifications
    FOR ALL USING (true);

-- Políticas para notification_settings
CREATE POLICY "Tenant owners can manage notification settings" ON notification_settings
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- ======================================
-- 5. FUNÇÕES PARA GERENCIAR NOTIFICAÇÕES
-- ======================================

-- Função para criar notificação
CREATE OR REPLACE FUNCTION create_notification(
    p_tenant_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_is_important BOOLEAN DEFAULT false,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
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

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Buscar tenant_id da notificação
    SELECT tenant_id INTO v_tenant_id
    FROM notifications
    WHERE id = p_notification_id;
    
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = v_tenant_id AND owner_id = auth.uid()
    ) THEN
        RETURN false;
    END IF;
    
    -- Marcar como lida
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id;
    
    RETURN true;
END;
$$;

-- Função para marcar todas as notificações como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id AND owner_id = auth.uid()
    ) THEN
        RETURN 0;
    END IF;
    
    -- Marcar todas como lidas
    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE tenant_id = p_tenant_id AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

-- Função para buscar notificações do tenant
CREATE OR REPLACE FUNCTION get_tenant_notifications(
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE(
    id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    data JSONB,
    is_read BOOLEAN,
    is_important BOOLEAN,
    created_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id AND owner_id = auth.uid()
    ) THEN
        RETURN;
    END IF;
    
    -- Retornar notificações
    RETURN QUERY
    SELECT 
        n.id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.is_important,
        n.created_at,
        n.read_at
    FROM notifications n
    WHERE n.tenant_id = p_tenant_id
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    AND (NOT p_unread_only OR n.is_read = false)
    ORDER BY n.is_important DESC, n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- Função para contar notificações não lidas
CREATE OR REPLACE FUNCTION count_unread_notifications(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id AND owner_id = auth.uid()
    ) THEN
        RETURN 0;
    END IF;
    
    -- Contar notificações não lidas
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE tenant_id = p_tenant_id 
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN v_count;
END;
$$;

-- ======================================
-- 6. TRIGGERS PARA NOTIFICAÇÕES AUTOMÁTICAS
-- ======================================

-- Trigger para notificar quando um agendamento é criado
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
        c.name,
        s.name,
        p.name,
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

-- Trigger para notificar quando um agendamento é atualizado
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
            c.name,
            s.name,
            p.name,
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

-- Trigger para notificar quando um agendamento é cancelado
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
            c.name,
            s.name,
            p.name,
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
-- 7. CRIAR TRIGGERS
-- ======================================

-- Trigger para agendamentos criados
DROP TRIGGER IF EXISTS trigger_notify_appointment_created ON appointments;
CREATE TRIGGER trigger_notify_appointment_created
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_created();

-- Trigger para agendamentos atualizados
DROP TRIGGER IF EXISTS trigger_notify_appointment_updated ON appointments;
CREATE TRIGGER trigger_notify_appointment_updated
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_updated();

-- Trigger para agendamentos cancelados
DROP TRIGGER IF EXISTS trigger_notify_appointment_cancelled ON appointments;
CREATE TRIGGER trigger_notify_appointment_cancelled
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_cancelled();

-- ======================================
-- 8. CONCEDER PERMISSÕES
-- ======================================

GRANT EXECUTE ON FUNCTION create_notification TO service_role;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_read TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO service_role;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO service_role;
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO service_role;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO authenticated;

-- ======================================
-- 9. COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ======================================

COMMENT ON TABLE notifications IS 'Sistema de notificações para tenants';
COMMENT ON TABLE notification_settings IS 'Configurações de notificação por tenant';
COMMENT ON FUNCTION create_notification IS 'Cria uma nova notificação para o tenant';
COMMENT ON FUNCTION mark_notification_read IS 'Marca uma notificação como lida';
COMMENT ON FUNCTION mark_all_notifications_read IS 'Marca todas as notificações do tenant como lidas';
COMMENT ON FUNCTION get_tenant_notifications IS 'Busca notificações do tenant';
COMMENT ON FUNCTION count_unread_notifications IS 'Conta notificações não lidas do tenant';

-- ======================================
-- 10. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'SISTEMA DE NOTIFICAÇÕES CRIADO:';
    RAISE NOTICE '- Tabela notifications criada';
    RAISE NOTICE '- Tabela notification_settings criada';
    RAISE NOTICE '- Funções de gerenciamento criadas';
    RAISE NOTICE '- Triggers automáticos configurados';
    RAISE NOTICE '- RLS e permissões configuradas';
END $$;
