-- Corrigir funções RPC para o sistema de notificações
-- Criado em: 2025-01-16

-- ======================================
-- 1. REMOVER FUNÇÕES EXISTENTES SE HOUVER CONFLITO
-- ======================================

-- Remover funções existentes para evitar conflitos
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER, BOOLEAN);
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER);
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID);

DROP FUNCTION IF EXISTS count_unread_notifications(UUID);

DROP FUNCTION IF EXISTS mark_notification_read(UUID);

DROP FUNCTION IF EXISTS mark_all_notifications_read(UUID);

DROP FUNCTION IF EXISTS create_test_notification(UUID);

-- ======================================
-- 2. CRIAR FUNÇÃO PARA BUSCAR NOTIFICAÇÕES DO TENANT
-- ======================================

CREATE OR REPLACE FUNCTION get_tenant_notifications(
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
    id UUID,
    tenant_id UUID,
    user_id UUID,
    type TEXT,
    title TEXT,
    message TEXT,
    data JSONB,
    is_read BOOLEAN,
    is_important BOOLEAN,
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    scheduled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.id,
        n.tenant_id,
        n.user_id,
        n.type,
        n.title,
        n.message,
        n.data,
        n.is_read,
        n.is_important,
        n.read_at,
        n.expires_at,
        n.scheduled_at,
        n.created_at,
        n.updated_at
    FROM notifications n
    WHERE n.tenant_id = p_tenant_id
    AND (NOT p_unread_only OR NOT n.is_read)
    AND (n.expires_at IS NULL OR n.expires_at > NOW())
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ======================================
-- 3. CRIAR FUNÇÃO PARA CONTAR NOTIFICAÇÕES NÃO LIDAS
-- ======================================

CREATE OR REPLACE FUNCTION count_unread_notifications(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM notifications
    WHERE tenant_id = p_tenant_id
    AND NOT is_read
    AND (expires_at IS NULL OR expires_at > NOW());
    
    RETURN v_count;
END;
$$;

-- ======================================
-- 4. CRIAR FUNÇÃO PARA MARCAR NOTIFICAÇÃO COMO LIDA
-- ======================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
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
    
    -- Verificar se a notificação existe
    IF v_tenant_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Verificar se o usuário tem permissão (é o owner do tenant)
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = v_tenant_id 
        AND owner_id = auth.uid()
    ) THEN
        RETURN false;
    END IF;
    
    -- Marcar como lida
    UPDATE notifications
    SET 
        is_read = true,
        read_at = NOW(),
        updated_at = NOW()
    WHERE id = p_notification_id;
    
    RETURN true;
END;
$$;

-- ======================================
-- 5. CRIAR FUNÇÃO PARA MARCAR TODAS COMO LIDAS
-- ======================================

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_tenant_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    -- Verificar se o usuário tem permissão (é o owner do tenant)
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id 
        AND owner_id = auth.uid()
    ) THEN
        RETURN 0;
    END IF;
    
    -- Marcar todas como lidas e contar quantas foram afetadas
    WITH updated AS (
        UPDATE notifications
        SET 
            is_read = true,
            read_at = NOW(),
            updated_at = NOW()
        WHERE tenant_id = p_tenant_id
        AND NOT is_read
        AND (expires_at IS NULL OR expires_at > NOW())
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;
    
    RETURN v_count;
END;
$$;

-- ======================================
-- 6. CRIAR FUNÇÃO PARA CRIAR NOTIFICAÇÃO DE TESTE
-- ======================================

CREATE OR REPLACE FUNCTION create_test_notification(p_tenant_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
BEGIN
    -- Verificar se o usuário tem permissão
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id 
        AND owner_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Acesso negado';
    END IF;
    
    -- Criar notificação de teste
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
        (SELECT owner_id FROM tenants WHERE id = p_tenant_id),
        'system_alert',
        'Notificação de Teste',
        'Esta é uma notificação de teste para verificar se o sistema está funcionando corretamente.',
        '{"test": true, "timestamp": "' || NOW() || '"}',
        false,
        NOW() + INTERVAL '7 days'
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- ======================================
-- 7. CONCEDER PERMISSÕES
-- ======================================

GRANT EXECUTE ON FUNCTION get_tenant_notifications TO service_role;
GRANT EXECUTE ON FUNCTION get_tenant_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION count_unread_notifications TO service_role;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION mark_notification_read TO service_role;
GRANT EXECUTE ON FUNCTION mark_notification_read TO authenticated;

GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO service_role;
GRANT EXECUTE ON FUNCTION mark_all_notifications_read TO authenticated;

GRANT EXECUTE ON FUNCTION create_test_notification TO service_role;
GRANT EXECUTE ON FUNCTION create_test_notification TO authenticated;

-- ======================================
-- 8. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'FUNÇÕES RPC CORRIGIDAS:';
    RAISE NOTICE '- Funções antigas removidas';
    RAISE NOTICE '- get_tenant_notifications: Buscar notificações do tenant';
    RAISE NOTICE '- count_unread_notifications: Contar notificações não lidas';
    RAISE NOTICE '- mark_notification_read: Marcar notificação como lida';
    RAISE NOTICE '- mark_all_notifications_read: Marcar todas como lidas';
    RAISE NOTICE '- create_test_notification: Criar notificação de teste';
    RAISE NOTICE '- Permissões concedidas para service_role e authenticated';
END $$;
