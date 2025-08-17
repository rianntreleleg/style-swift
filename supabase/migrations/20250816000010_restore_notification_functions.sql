-- Restaurar funções básicas de notificação
-- Data: 2025-08-16

-- ======================================
-- 1. FUNÇÃO PARA OBTER NOTIFICAÇÕES DO TENANT
-- ======================================

CREATE OR REPLACE FUNCTION get_tenant_notifications(
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE (
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
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ======================================
-- 2. FUNÇÃO PARA CONTAR NOTIFICAÇÕES NÃO LIDAS
-- ======================================

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

    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE tenant_id = p_tenant_id AND NOT is_read;

    RETURN COALESCE(v_count, 0);
END;
$$;

-- ======================================
-- 3. FUNÇÃO PARA MARCAR NOTIFICAÇÃO COMO LIDA
-- ======================================

CREATE OR REPLACE FUNCTION mark_notification_as_read(
    p_notification_id UUID,
    p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id AND owner_id = auth.uid()
    ) THEN
        RETURN false;
    END IF;

    UPDATE notifications
    SET is_read = true, read_at = NOW()
    WHERE id = p_notification_id AND tenant_id = p_tenant_id;

    RETURN FOUND;
END;
$$;

-- ======================================
-- 4. FUNÇÃO PARA MARCAR TODAS COMO LIDAS
-- ======================================

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
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id AND owner_id = auth.uid()
    ) THEN
        RETURN 0;
    END IF;

    WITH updated AS (
        UPDATE notifications
        SET is_read = true, read_at = NOW()
        WHERE tenant_id = p_tenant_id AND NOT is_read
        RETURNING id
    )
    SELECT COUNT(*) INTO v_count FROM updated;

    RETURN v_count;
END;
$$;

-- ======================================
-- 5. FUNÇÃO PARA TESTAR O SISTEMA
-- ======================================

CREATE OR REPLACE FUNCTION test_notification_system(p_tenant_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notification_id UUID;
    v_result JSONB;
BEGIN
    -- Verificar se o usuário tem acesso ao tenant
    IF NOT EXISTS (
        SELECT 1 FROM tenants 
        WHERE id = p_tenant_id AND owner_id = auth.uid()
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Acesso negado ao tenant'
        );
    END IF;

    -- Criar notificação de teste
    INSERT INTO notifications (
        tenant_id,
        user_id,
        type,
        title,
        message,
        data,
        is_important
    ) VALUES (
        p_tenant_id,
        auth.uid(),
        'system_alert',
        'Teste do Sistema de Notificações',
        'Esta é uma notificação de teste para verificar se o sistema está funcionando corretamente.',
        jsonb_build_object('test', true, 'timestamp', NOW()),
        false
    ) RETURNING id INTO v_notification_id;

    RETURN jsonb_build_object(
        'success', true,
        'notification_id', v_notification_id,
        'message', 'Notificação de teste criada com sucesso'
    );
END;
$$;

-- ======================================
-- 6. CONCEDER PERMISSÕES
-- ======================================

GRANT EXECUTE ON FUNCTION get_tenant_notifications TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION count_unread_notifications TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION mark_notification_as_read TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION mark_all_notifications_as_read TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION test_notification_system TO service_role, authenticated;

-- ======================================
-- 7. VERIFICAÇÃO FINAL
-- ======================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_test_result JSONB;
BEGIN
    -- Pegar o primeiro tenant para teste
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        -- Testar a função de teste
        SELECT test_notification_system(v_tenant_id) INTO v_test_result;
        
        RAISE NOTICE 'SISTEMA DE NOTIFICAÇÕES RESTAURADO:';
        RAISE NOTICE '- Funções básicas criadas';
        RAISE NOTICE '- Permissões concedidas';
        RAISE NOTICE '- Teste executado: %', v_test_result;
    END IF;
END $$;
