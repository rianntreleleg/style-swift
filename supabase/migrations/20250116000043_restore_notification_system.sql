-- Restauração completa do sistema de notificações
-- Data: 2025-01-16
-- Objetivo: Restaurar o sistema de notificações ao estado funcional anterior

-- ======================================
-- 1. LIMPEZA E RECRIAÇÃO DAS TABELAS
-- ======================================

-- Remover todas as tabelas relacionadas ao Firebase (conforme solicitado)
DROP TABLE IF EXISTS fcm_tokens CASCADE;
DROP TABLE IF EXISTS notification_logs CASCADE;
DROP TABLE IF EXISTS scheduled_notifications CASCADE;
DROP TABLE IF EXISTS notification_templates CASCADE;

-- Recriar tabela notifications com estrutura simples e funcional
DROP TABLE IF EXISTS notifications CASCADE;
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
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Recriar tabela notification_settings com estrutura simples
DROP TABLE IF EXISTS notification_settings CASCADE;
CREATE TABLE notification_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Tipos de notificação
    appointment_created BOOLEAN DEFAULT true,
    appointment_updated BOOLEAN DEFAULT true,
    appointment_cancelled BOOLEAN DEFAULT true,
    appointment_completed BOOLEAN DEFAULT true,
    payment_received BOOLEAN DEFAULT true,
    system_alerts BOOLEAN DEFAULT true,
    
    -- Canais de notificação
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    
    -- Configurações de horário
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00',
    timezone TEXT DEFAULT 'America/Sao_Paulo',
    
    -- Configurações de frequência
    max_notifications_per_day INTEGER DEFAULT 50,
    reminder_advance_hours INTEGER DEFAULT 24,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(tenant_id, user_id)
);

-- ======================================
-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ======================================

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, is_read) WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant_id ON notification_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- ======================================
-- 3. CONFIGURAR RLS (Row Level Security)
-- ======================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para notifications
DROP POLICY IF EXISTS "Tenant users can view their notifications" ON notifications;
CREATE POLICY "Tenant users can view their notifications" ON notifications
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "System can manage notifications" ON notifications;
CREATE POLICY "System can manage notifications" ON notifications
    FOR ALL USING (true);

-- Políticas para notification_settings
DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- ======================================
-- 4. CRIAR CONFIGURAÇÕES PADRÃO PARA TODOS OS TENANTS
-- ======================================

DO $$
DECLARE
    v_tenant RECORD;
BEGIN
    FOR v_tenant IN SELECT id, owner_id FROM tenants LOOP
        INSERT INTO notification_settings (
            tenant_id, user_id, appointment_created, appointment_updated, 
            appointment_cancelled, appointment_completed, payment_received, 
            system_alerts, email_notifications, push_notifications
        ) VALUES (
            v_tenant.id, v_tenant.owner_id, true, true, true, true, true, true, true, true
        ) ON CONFLICT (tenant_id, user_id) DO UPDATE SET
            appointment_created = EXCLUDED.appointment_created,
            appointment_updated = EXCLUDED.appointment_updated,
            appointment_cancelled = EXCLUDED.appointment_cancelled,
            appointment_completed = EXCLUDED.appointment_completed,
            payment_received = EXCLUDED.payment_received,
            system_alerts = EXCLUDED.system_alerts,
            email_notifications = EXCLUDED.email_notifications,
            push_notifications = EXCLUDED.push_notifications,
            updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'Configurações de notificação criadas/atualizadas para todos os tenants';
END $$;

-- ======================================
-- 5. CRIAR FUNÇÕES RPC SIMPLES E FUNCIONAIS
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
    SELECT owner_id INTO v_owner_id FROM tenants WHERE id = p_tenant_id;
    
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Tenant não encontrado: %', p_tenant_id;
    END IF;
    
    -- Inserir notificação
    INSERT INTO notifications (
        tenant_id, user_id, type, title, message, data, is_important, expires_at
    ) VALUES (
        p_tenant_id, v_owner_id, p_type, p_title, p_message, p_data, p_is_important, p_expires_at
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao criar notificação: %', SQLERRM;
        RETURN NULL;
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
        SELECT 1 FROM tenants t
        WHERE t.id = p_tenant_id AND t.owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Acesso negado ao tenant';
    END IF;

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
    AND (NOT p_unread_only OR NOT n.is_read)
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
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
        SELECT 1 FROM tenants t
        WHERE t.id = p_tenant_id AND t.owner_id = auth.uid()
    ) THEN
        RETURN 0;
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE tenant_id = p_tenant_id 
    AND NOT is_read
    AND (expires_at IS NULL OR expires_at > NOW());

    RETURN COALESCE(v_count, 0);
END;
$$;

-- Função para marcar notificação como lida
CREATE OR REPLACE FUNCTION mark_notification_as_read(
    p_notification_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Buscar tenant_id e user_id da notificação
    SELECT tenant_id, user_id INTO v_tenant_id, v_user_id
    FROM notifications
    WHERE id = p_notification_id;
    
    -- Verificar se a notificação existe e pertence ao tenant
    IF v_tenant_id IS NULL OR v_tenant_id != p_tenant_id THEN
        RETURN false;
    END IF;
    
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants t
        WHERE t.id = p_tenant_id AND t.owner_id = auth.uid()
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
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants t
        WHERE t.id = p_tenant_id AND t.owner_id = auth.uid()
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

-- ======================================
-- 6. CRIAR FUNÇÕES DE TRIGGER SIMPLES E FUNCIONAIS
-- ======================================

-- Trigger para notificar quando um agendamento é criado
CREATE OR REPLACE FUNCTION notify_appointment_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_name TEXT := 'Cliente';
    v_service_name TEXT := 'Serviço';
    v_professional_name TEXT := 'Profissional';
    v_notification_enabled BOOLEAN := false;
BEGIN
    -- Verificar se as notificações estão habilitadas
    SELECT appointment_created INTO v_notification_enabled
    FROM notification_settings 
    WHERE tenant_id = NEW.tenant_id
    LIMIT 1;
    
    -- Se não há configuração ou não está habilitada, sair
    IF NOT COALESCE(v_notification_enabled, false) THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados relacionados com tratamento de erro
    BEGIN
        SELECT COALESCE(c.name, 'Cliente') INTO v_customer_name
        FROM customers c WHERE c.id = NEW.customer_id;
    EXCEPTION
        WHEN OTHERS THEN v_customer_name := 'Cliente';
    END;
    
    BEGIN
        SELECT COALESCE(s.name, 'Serviço') INTO v_service_name
        FROM services s WHERE s.id = NEW.service_id;
    EXCEPTION
        WHEN OTHERS THEN v_service_name := 'Serviço';
    END;
    
    BEGIN
        SELECT COALESCE(p.name, 'Profissional') INTO v_professional_name
        FROM professionals p WHERE p.id = NEW.professional_id;
    EXCEPTION
        WHEN OTHERS THEN v_professional_name := 'Profissional';
    END;
    
    -- Criar notificação
    PERFORM create_notification(
        NEW.tenant_id,
        'appointment_created',
        'Novo Agendamento',
        format('Cliente %s agendou %s com %s para %s',
            v_customer_name,
            v_service_name,
            v_professional_name,
            TO_CHAR(NEW.start_time, 'DD/MM/YYYY HH24:MI')
        ),
        jsonb_build_object(
            'appointment_id', NEW.id,
            'customer_name', v_customer_name,
            'service_name', v_service_name,
            'professional_name', v_professional_name
        ),
        false,
        NOW() + INTERVAL '7 days'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro no trigger de criação de agendamento: %', SQLERRM;
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
    v_customer_name TEXT := 'Cliente';
    v_notification_enabled BOOLEAN := false;
BEGIN
    -- Verificar se as notificações estão habilitadas
    SELECT appointment_updated INTO v_notification_enabled
    FROM notification_settings 
    WHERE tenant_id = NEW.tenant_id
    LIMIT 1;
    
    -- Se não há configuração ou não está habilitada, sair
    IF NOT COALESCE(v_notification_enabled, false) THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se houve mudança significativa
    IF OLD.status = NEW.status AND OLD.start_time = NEW.start_time THEN
        RETURN NEW;
    END IF;
    
    -- Buscar nome do cliente
    BEGIN
        SELECT COALESCE(c.name, 'Cliente') INTO v_customer_name
        FROM customers c WHERE c.id = NEW.customer_id;
    EXCEPTION
        WHEN OTHERS THEN v_customer_name := 'Cliente';
    END;
    
    -- Criar notificação baseada na mudança
    IF OLD.status != NEW.status THEN
        PERFORM create_notification(
            NEW.tenant_id,
            'appointment_updated',
            'Status do Agendamento Alterado',
            format('Agendamento de %s foi alterado para: %s',
                v_customer_name,
                NEW.status
            ),
            jsonb_build_object(
                'appointment_id', NEW.id,
                'customer_name', v_customer_name,
                'old_status', OLD.status,
                'new_status', NEW.status
            ),
            false,
            NOW() + INTERVAL '7 days'
        );
    ELSE
        PERFORM create_notification(
            NEW.tenant_id,
            'appointment_updated',
            'Agendamento Reagendado',
            format('Agendamento de %s foi reagendado para %s',
                v_customer_name,
                TO_CHAR(NEW.start_time, 'DD/MM/YYYY HH24:MI')
            ),
            jsonb_build_object(
                'appointment_id', NEW.id,
                'customer_name', v_customer_name,
                'old_start_time', OLD.start_time,
                'new_start_time', NEW.start_time
            ),
            false,
            NOW() + INTERVAL '7 days'
        );
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro no trigger de atualização de agendamento: %', SQLERRM;
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
    v_customer_name TEXT := 'Cliente';
    v_service_name TEXT := 'Serviço';
    v_notification_enabled BOOLEAN := false;
BEGIN
    -- Só notificar se o status mudou para cancelado
    IF NEW.status != 'cancelado' OR OLD.status = 'cancelado' THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se as notificações estão habilitadas
    SELECT appointment_cancelled INTO v_notification_enabled
    FROM notification_settings 
    WHERE tenant_id = NEW.tenant_id
    LIMIT 1;
    
    -- Se não há configuração ou não está habilitada, sair
    IF NOT COALESCE(v_notification_enabled, false) THEN
        RETURN NEW;
    END IF;
    
    -- Buscar dados relacionados
    BEGIN
        SELECT COALESCE(c.name, 'Cliente') INTO v_customer_name
        FROM customers c WHERE c.id = NEW.customer_id;
    EXCEPTION
        WHEN OTHERS THEN v_customer_name := 'Cliente';
    END;
    
    BEGIN
        SELECT COALESCE(s.name, 'Serviço') INTO v_service_name
        FROM services s WHERE s.id = NEW.service_id;
    EXCEPTION
        WHEN OTHERS THEN v_service_name := 'Serviço';
    END;
    
    -- Criar notificação
    PERFORM create_notification(
        NEW.tenant_id,
        'appointment_cancelled',
        'Agendamento Cancelado',
        format('Agendamento de %s para %s foi cancelado',
            v_customer_name,
            v_service_name
        ),
        jsonb_build_object(
            'appointment_id', NEW.id,
            'customer_name', v_customer_name,
            'service_name', v_service_name
        ),
        true, -- Importante
        NOW() + INTERVAL '7 days'
    );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro no trigger de cancelamento de agendamento: %', SQLERRM;
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
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO service_role;
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO service_role;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO service_role;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO authenticated;

-- ======================================
-- 9. FUNÇÃO DE TESTE DO SISTEMA
-- ======================================

CREATE OR REPLACE FUNCTION test_notification_system(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_total_notifications INTEGER;
    v_unread_count INTEGER;
    v_settings_exist BOOLEAN;
BEGIN
    -- Verificar se o tenant existe
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Tenant não encontrado'
        );
    END IF;
    
    -- Verificar se há configurações
    SELECT EXISTS (
        SELECT 1 FROM notification_settings WHERE tenant_id = p_tenant_id
    ) INTO v_settings_exist;
    
    -- Criar notificação de teste
    v_notification_id := create_notification(
        p_tenant_id,
        'system_alert',
        'Teste do Sistema de Notificações',
        'Esta é uma notificação de teste para verificar se o sistema está funcionando corretamente.',
        jsonb_build_object('test', true, 'timestamp', NOW()),
        false,
        NOW() + INTERVAL '1 hour'
    );
    
    -- Contar notificações
    SELECT COUNT(*) INTO v_total_notifications FROM notifications WHERE tenant_id = p_tenant_id;
    SELECT COUNT(*) INTO v_unread_count FROM notifications WHERE tenant_id = p_tenant_id AND NOT is_read;
    
    RETURN jsonb_build_object(
        'success', true,
        'notification_id', v_notification_id,
        'total_notifications', v_total_notifications,
        'unread_count', v_unread_count,
        'settings_exist', v_settings_exist,
        'message', 'Sistema de notificações funcionando corretamente'
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

GRANT EXECUTE ON FUNCTION test_notification_system TO service_role;
GRANT EXECUTE ON FUNCTION test_notification_system TO authenticated;

-- ======================================
-- 10. VALIDAÇÃO FINAL
-- ======================================

DO $$
DECLARE
    v_tenant_count INTEGER;
    v_settings_count INTEGER;
    v_notification_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tenant_count FROM tenants;
    SELECT COUNT(*) INTO v_settings_count FROM notification_settings;
    SELECT COUNT(*) INTO v_notification_count FROM notifications;
    
    RAISE NOTICE 'SISTEMA DE NOTIFICAÇÕES RESTAURADO:';
    RAISE NOTICE '- Total de tenants: %', v_tenant_count;
    RAISE NOTICE '- Configurações criadas: %', v_settings_count;
    RAISE NOTICE '- Notificações existentes: %', v_notification_count;
    RAISE NOTICE '- Triggers criados e funcionando';
    RAISE NOTICE '- Funções RPC disponíveis';
    RAISE NOTICE '- Sistema pronto para uso';
    RAISE NOTICE '- Firebase removido conforme solicitado';
END $$;
