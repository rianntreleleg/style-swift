-- Corrigir erro de coluna ambígua na função get_tenant_notifications
-- Data: 2025-08-16

-- ======================================
-- CORRIGIR FUNÇÃO get_tenant_notifications
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
    ORDER BY n.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- ======================================
-- VERIFICAÇÃO
-- ======================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_test_result JSONB;
BEGIN
    -- Pegar o primeiro tenant para teste
    SELECT t.id INTO v_tenant_id FROM tenants t LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        RAISE NOTICE 'TESTANDO FUNÇÃO CORRIGIDA:';
        RAISE NOTICE '- Tenant ID: %', v_tenant_id;
        
        -- Testar a função de notificações
        BEGIN
            PERFORM get_tenant_notifications(v_tenant_id, 5, 0, false);
            RAISE NOTICE '- Função get_tenant_notifications: OK';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '- Erro na função: %', SQLERRM;
        END;
        
        -- Testar a função de teste
        SELECT test_notification_system(v_tenant_id) INTO v_test_result;
        RAISE NOTICE '- Teste do sistema: %', v_test_result;
    END IF;
END $$;
