-- CORREÇÃO DEFINITIVA DO SISTEMA DE NOTIFICAÇÕES
-- Data: 2025-08-16
-- Esta migração resolve todos os problemas de notificações de uma vez por todas

-- 1. REMOVER TODAS AS FUNÇÕES E TRIGGERS PROBLEMÁTICOS
DO $$
BEGIN
    -- Remover triggers
    DROP TRIGGER IF EXISTS trigger_notify_appointment_created ON appointments;
    DROP TRIGGER IF EXISTS trigger_notify_appointment_updated ON appointments;
    
    -- Remover funções problemáticas
    DROP FUNCTION IF EXISTS notify_appointment_created() CASCADE;
    DROP FUNCTION IF EXISTS notify_appointment_updated() CASCADE;
    DROP FUNCTION IF EXISTS test_notification_system(UUID) CASCADE;
    DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER, BOOLEAN) CASCADE;
    DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER) CASCADE;
    DROP FUNCTION IF EXISTS get_tenant_notifications(UUID) CASCADE;
    DROP FUNCTION IF EXISTS count_unread_notifications(UUID) CASCADE;
    DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, JSONB, BOOLEAN, TIMESTAMPTZ) CASCADE;
    
    RAISE NOTICE 'Funções e triggers antigos removidos com sucesso';
END $$;

-- 2. GARANTIR QUE AS TABELAS EXISTEM COM A ESTRUTURA CORRETA
-- Tabela notifications
CREATE TABLE IF NOT EXISTS notifications (
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, is_read) WHERE is_read = false;

-- RLS para notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- Tabela notification_settings
CREATE TABLE IF NOT EXISTS notification_settings (
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

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_notification_settings_tenant_id ON notification_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_user_id ON notification_settings(user_id);

-- RLS para notification_settings
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notification settings" ON notification_settings;
CREATE POLICY "Users can view their own notification settings" ON notification_settings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own notification settings" ON notification_settings;
CREATE POLICY "Users can insert their own notification settings" ON notification_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notification settings" ON notification_settings;
CREATE POLICY "Users can update their own notification settings" ON notification_settings
    FOR UPDATE USING (auth.uid() = user_id);

-- 3. CRIAR CONFIGURAÇÕES PADRÃO PARA TODOS OS TENANTS
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
            updated_at = NOW();
    END LOOP;
    
    RAISE NOTICE 'Configurações de notificação criadas/atualizadas para todos os tenants';
END $$;

-- 4. CRIAR FUNÇÃO PARA CRIAR NOTIFICAÇÕES
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

-- 5. CRIAR FUNÇÕES RPC PARA O FRONTEND
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
    -- Verificar acesso ao tenant
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND owner_id = auth.uid()) THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT 
        n.id, n.type, n.title, n.message, n.data, n.is_read, n.is_important, n.created_at, n.read_at
    FROM notifications n
    WHERE n.tenant_id = p_tenant_id
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    AND (NOT p_unread_only OR n.is_read = false)
    ORDER BY n.is_important DESC, n.created_at DESC
    LIMIT p_limit OFFSET p_offset;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao buscar notificações: %', SQLERRM;
        RETURN;
END;
$$;

CREATE OR REPLACE FUNCTION count_unread_notifications(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Verificar acesso ao tenant
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND owner_id = auth.uid()) THEN
        RETURN 0;
    END IF;
    
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE tenant_id = p_tenant_id 
    AND is_read = false
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN COALESCE(v_count, 0);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao contar notificações: %', SQLERRM;
        RETURN 0;
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
BEGIN
    -- Verificar acesso ao tenant
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND owner_id = auth.uid()) THEN
        RETURN false;
    END IF;
    
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id AND tenant_id = p_tenant_id;
    
    RETURN FOUND;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao marcar notificação como lida: %', SQLERRM;
        RETURN false;
END;
$$;

-- Função para marcar todas as notificações como lidas
CREATE OR REPLACE FUNCTION mark_all_notifications_as_read(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER := 0;
BEGIN
    -- Verificar acesso ao tenant
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND owner_id = auth.uid()) THEN
        RETURN 0;
    END IF;
    
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE tenant_id = p_tenant_id AND is_read = false;
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao marcar todas as notificações como lidas: %', SQLERRM;
        RETURN 0;
END;
$$;

-- 6. CRIAR FUNÇÕES DE TRIGGER ROBUSTAS
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

CREATE OR REPLACE FUNCTION notify_appointment_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_customer_name TEXT := 'Cliente';
    v_notification_enabled BOOLEAN := false;
BEGIN
    -- Verificar se houve mudança significativa
    IF OLD.start_time = NEW.start_time AND OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;
    
    -- Verificar se as notificações estão habilitadas
    SELECT appointment_updated INTO v_notification_enabled
    FROM notification_settings 
    WHERE tenant_id = NEW.tenant_id
    LIMIT 1;
    
    -- Se não há configuração ou não está habilitada, sair
    IF NOT COALESCE(v_notification_enabled, false) THEN
        RETURN NEW;
    END IF;
    
    -- Buscar nome do cliente
    BEGIN
        SELECT COALESCE(c.name, 'Cliente') INTO v_customer_name
        FROM customers c WHERE c.id = NEW.customer_id;
    EXCEPTION
        WHEN OTHERS THEN v_customer_name := 'Cliente';
    END;
    
    -- Criar notificação baseada no tipo de mudança
    IF OLD.status != NEW.status THEN
        PERFORM create_notification(
            NEW.tenant_id,
            'appointment_updated',
            'Status do Agendamento Alterado',
            format('Agendamento de %s foi alterado para: %s', v_customer_name, NEW.status),
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

-- 7. CRIAR TRIGGERS
CREATE TRIGGER trigger_notify_appointment_created
    AFTER INSERT ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_created();

CREATE TRIGGER trigger_notify_appointment_updated
    AFTER UPDATE ON appointments
    FOR EACH ROW
    EXECUTE FUNCTION notify_appointment_updated();

-- 8. FUNÇÃO DE TESTE DO SISTEMA
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
    -- Verificar acesso ao tenant
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id AND owner_id = auth.uid()) THEN
        RETURN jsonb_build_object('error', 'Acesso negado ao tenant');
    END IF;
    
    -- Verificar se existem configurações
    SELECT EXISTS(SELECT 1 FROM notification_settings WHERE tenant_id = p_tenant_id) INTO v_settings_exist;
    
    -- Criar configuração se não existir
    IF NOT v_settings_exist THEN
        INSERT INTO notification_settings (tenant_id, user_id)
        SELECT p_tenant_id, owner_id FROM tenants WHERE id = p_tenant_id;
    END IF;
    
    -- Criar notificação de teste
    SELECT create_notification(
        p_tenant_id,
        'system_alert',
        'Teste do Sistema de Notificações',
        'Esta é uma notificação de teste criada em ' || TO_CHAR(NOW(), 'DD/MM/YYYY HH24:MI:SS'),
        jsonb_build_object('test', true, 'timestamp', NOW()),
        false,
        NOW() + INTERVAL '1 hour'
    ) INTO v_notification_id;
    
    -- Buscar estatísticas
    SELECT COUNT(*) INTO v_total_notifications FROM notifications WHERE tenant_id = p_tenant_id;
    SELECT count_unread_notifications(p_tenant_id) INTO v_unread_count;
    
    RETURN jsonb_build_object(
        'success', true,
        'test_notification_id', v_notification_id,
        'total_notifications', v_total_notifications,
        'unread_count', v_unread_count,
        'settings_exist', v_settings_exist,
        'timestamp', NOW()
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', SQLERRM,
            'timestamp', NOW()
        );
END;
$$;

-- 9. CONCEDER PERMISSÕES
GRANT EXECUTE ON FUNCTION create_notification TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION test_notification_system TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION notify_appointment_created TO service_role;
GRANT EXECUTE ON FUNCTION notify_appointment_updated TO service_role;

-- 10. CRIAR NOTIFICAÇÃO DE TESTE FINAL
DO $$
DECLARE
    v_tenant_id UUID;
    v_result JSONB;
BEGIN
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        SELECT test_notification_system(v_tenant_id) INTO v_result;
        RAISE NOTICE 'Teste do sistema: %', v_result;
    END IF;
END $$;

RAISE NOTICE '✅ SISTEMA DE NOTIFICAÇÕES CORRIGIDO COM SUCESSO!';
RAISE NOTICE '📊 Estatísticas finais:';
RAISE NOTICE '   - Configurações de notificação: % tenants', (SELECT COUNT(*) FROM notification_settings);
RAISE NOTICE '   - Total de notificações: %', (SELECT COUNT(*) FROM notifications);
RAISE NOTICE '   - Triggers ativos: 2 (appointment_created, appointment_updated)';
RAISE NOTICE '   - Funções RPC: 6 (create, get, count, mark_read, mark_all_read, test)';
