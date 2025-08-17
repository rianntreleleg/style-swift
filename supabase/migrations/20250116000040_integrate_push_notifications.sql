-- Integração de Push Notifications com o Sistema de Notificações
-- Criado em: 2025-01-16

-- ======================================
-- 1. FUNÇÃO PARA ENVIAR PUSH NOTIFICATION
-- ======================================

CREATE OR REPLACE FUNCTION send_push_notification_for_tenant(
    p_tenant_id UUID,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_edge_function_url TEXT;
    v_response JSONB;
BEGIN
    -- URL da Edge Function (hardcoded para desenvolvimento e produção)
    v_edge_function_url := CASE 
        WHEN current_setting('server_version_num')::int >= 120000 THEN
            'https://jsubmkwvqzddgppvgxiu.supabase.co/functions/v1/send-push-notification'
        ELSE
            'http://localhost:54321/functions/v1/send-push-notification'
    END;
    
    -- Chamar Edge Function via http
    SELECT
        content::jsonb INTO v_response
    FROM
        http((
            'POST',
            v_edge_function_url,
            ARRAY[http_header('Content-Type', 'application/json')],
            jsonb_build_object(
                'tenantId', p_tenant_id,
                'title', p_title,
                'body', p_message,
                'data', p_data
            )::text,
            10
        ));

    -- Retornar sucesso
    RETURN (v_response->>'success')::boolean;
EXCEPTION
    WHEN OTHERS THEN
        -- Log do erro
        INSERT INTO notification_logs (
            tenant_id,
            type,
            title,
            message,
            data,
            success,
            error_message
        ) VALUES (
            p_tenant_id,
            'push_notification',
            p_title,
            p_message,
            p_data,
            false,
            SQLERRM
        );
        
        RETURN false;
END;
$$;

-- ======================================
-- 2. MODIFICAR FUNÇÃO CREATE_NOTIFICATION
-- ======================================

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
    v_push_enabled BOOLEAN;
BEGIN
    -- Buscar owner_id do tenant
    SELECT owner_id INTO v_owner_id
    FROM tenants
    WHERE id = p_tenant_id;
    
    -- Verificar se o tenant existe
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Tenant não encontrado';
    END IF;
    
    -- Verificar se push notifications estão habilitadas
    SELECT push_notifications INTO v_push_enabled
    FROM notification_settings
    WHERE tenant_id = p_tenant_id;
    
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
    
    -- Enviar push notification se habilitado
    IF v_push_enabled THEN
        PERFORM send_push_notification_for_tenant(
            p_tenant_id,
            p_title,
            p_message,
            jsonb_build_object(
                'notification_id', v_notification_id,
                'type', p_type,
                'data', p_data
            )
        );
    END IF;
    
    RETURN v_notification_id;
END;
$$;

-- ======================================
-- 4. CONCEDER PERMISSÕES
-- ======================================

GRANT EXECUTE ON FUNCTION send_push_notification_for_tenant TO service_role;
GRANT EXECUTE ON FUNCTION send_push_notification_for_tenant TO authenticated;

-- ======================================
-- 5. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'INTEGRAÇÃO DE PUSH NOTIFICATIONS:';
    RAISE NOTICE '- Função send_push_notification_for_tenant criada';
    RAISE NOTICE '- Função create_notification atualizada';
    RAISE NOTICE '- Edge Function URL configurada';
    RAISE NOTICE '- Permissões concedidas';
END $$;