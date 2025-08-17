-- Correção da ambiguidade de coluna na função get_tenant_notifications
-- Data: 2025-01-16

-- Remover função antiga primeiro
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_tenant_notifications(UUID) CASCADE;

-- Corrigir a função get_tenant_notifications para evitar ambiguidade de coluna
CREATE OR REPLACE FUNCTION get_tenant_notifications(
    p_tenant_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0,
    p_unread_only BOOLEAN DEFAULT false
)
RETURNS TABLE(
    notification_id UUID,
    notification_type TEXT,
    notification_title TEXT,
    notification_message TEXT,
    notification_data JSONB,
    notification_is_read BOOLEAN,
    notification_is_important BOOLEAN,
    notification_created_at TIMESTAMPTZ,
    notification_read_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se o tenant existe (sem verificar owner_id para permitir acesso)
    IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = p_tenant_id) THEN
        RAISE WARNING 'Tenant não encontrado: %', p_tenant_id;
        RETURN;
    END IF;
    
    -- Retornar notificações
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

-- Atualizar o hook useNotifications para usar os novos nomes de coluna
-- (Isso será feito no frontend)

-- Teste da função corrigida
DO $$
DECLARE
    v_tenant_id UUID;
    v_notification_count INTEGER;
BEGIN
    -- Pegar um tenant para teste
    SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
    
    IF v_tenant_id IS NOT NULL THEN
        RAISE NOTICE '=== TESTE DA FUNÇÃO CORRIGIDA ===';
        
        -- Testar função get_tenant_notifications
        SELECT COUNT(*) INTO v_notification_count
        FROM get_tenant_notifications(v_tenant_id, 10, 0, false);
        
        RAISE NOTICE 'Notificações retornadas pela função corrigida: %', v_notification_count;
        
        -- Testar função count_unread_notifications
        SELECT count_unread_notifications(v_tenant_id) INTO v_notification_count;
        RAISE NOTICE 'Notificações não lidas: %', v_notification_count;
        
    ELSE
        RAISE NOTICE '❌ Nenhum tenant encontrado para teste';
    END IF;
END $$;

DO $$
BEGIN
    RAISE NOTICE '🔧 AMBIGUIDADE DE COLUNA CORRIGIDA - Atualize o frontend!';
END $$;
