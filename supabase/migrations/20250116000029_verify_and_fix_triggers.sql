-- Migração para verificar e corrigir os triggers de notificação
-- Data: 2025-01-16

-- Verificar se os triggers existem e estão funcionando
DO $$
BEGIN
    -- Verificar se o trigger de appointment_created existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_notify_appointment_created'
    ) THEN
        RAISE NOTICE 'Trigger trigger_notify_appointment_created não existe. Criando...';
        
        CREATE TRIGGER trigger_notify_appointment_created
            AFTER INSERT ON appointments
            FOR EACH ROW
            EXECUTE FUNCTION notify_appointment_created();
    END IF;
    
    -- Verificar se o trigger de appointment_updated existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_notify_appointment_updated'
    ) THEN
        RAISE NOTICE 'Trigger trigger_notify_appointment_updated não existe. Criando...';
        
        CREATE TRIGGER trigger_notify_appointment_updated
            AFTER UPDATE ON appointments
            FOR EACH ROW
            EXECUTE FUNCTION notify_appointment_updated();
    END IF;
    
    RAISE NOTICE 'Verificação de triggers concluída.';
END $$;

-- Remover funções existentes para evitar conflitos
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID);
DROP FUNCTION IF EXISTS count_unread_notifications(UUID);

-- Criar função get_tenant_notifications
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

-- Criar função count_unread_notifications
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

-- Conceder permissões necessárias
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO service_role;
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO authenticated;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO service_role;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO authenticated;

-- Verificar se há dados de teste para debug
DO $$
DECLARE
    v_tenant_count INTEGER;
    v_appointment_count INTEGER;
    v_notification_count INTEGER;
    v_settings_count INTEGER;
    v_appointment RECORD;
    v_notification RECORD;
BEGIN
    -- Contar tenants
    SELECT COUNT(*) INTO v_tenant_count FROM tenants;
    RAISE NOTICE 'Tenants encontrados: %', v_tenant_count;
    
    -- Contar agendamentos
    SELECT COUNT(*) INTO v_appointment_count FROM appointments;
    RAISE NOTICE 'Agendamentos encontrados: %', v_appointment_count;
    
    -- Contar notificações
    SELECT COUNT(*) INTO v_notification_count FROM notifications;
    RAISE NOTICE 'Notificações encontradas: %', v_notification_count;
    
    -- Contar configurações de notificação
    SELECT COUNT(*) INTO v_settings_count FROM notification_settings;
    RAISE NOTICE 'Configurações de notificação encontradas: %', v_settings_count;
    
    -- Mostrar alguns agendamentos recentes para debug
    RAISE NOTICE 'Agendamentos recentes:';
    FOR v_appointment IN 
        SELECT id, tenant_id, status, created_at 
        FROM appointments 
        ORDER BY created_at DESC 
        LIMIT 5
    LOOP
        RAISE NOTICE '  ID: %, Tenant: %, Status: %, Created: %', 
            v_appointment.id, v_appointment.tenant_id, v_appointment.status, v_appointment.created_at;
    END LOOP;
    
    -- Mostrar algumas notificações para debug
    RAISE NOTICE 'Notificações recentes:';
    FOR v_notification IN 
        SELECT id, tenant_id, type, title, created_at 
        FROM notifications 
        ORDER BY created_at DESC 
        LIMIT 5
    LOOP
        RAISE NOTICE '  ID: %, Tenant: %, Type: %, Title: %, Created: %', 
            v_notification.id, v_notification.tenant_id, v_notification.type, v_notification.title, v_notification.created_at;
    END LOOP;
END $$;

-- Criar uma notificação de teste para verificar se o sistema está funcionando
DO $$
DECLARE
    v_test_tenant_id UUID;
    v_test_notification_id UUID;
BEGIN
    -- Pegar o primeiro tenant disponível
    SELECT id INTO v_test_tenant_id FROM tenants LIMIT 1;
    
    IF v_test_tenant_id IS NOT NULL THEN
        -- Criar uma notificação de teste
        INSERT INTO notifications (
            tenant_id,
            user_id,
            type,
            title,
            message,
            data,
            is_important,
            created_at
        ) VALUES (
            v_test_tenant_id,
            (SELECT owner_id FROM tenants WHERE id = v_test_tenant_id),
            'system_alert',
            'Teste de Notificação',
            'Esta é uma notificação de teste para verificar se o sistema está funcionando.',
            '{"test": true}',
            false,
            NOW()
        ) RETURNING id INTO v_test_notification_id;
        
        RAISE NOTICE 'Notificação de teste criada com ID: %', v_test_notification_id;
    ELSE
        RAISE NOTICE 'Nenhum tenant encontrado para criar notificação de teste';
    END IF;
END $$;
