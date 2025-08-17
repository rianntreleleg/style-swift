-- Correção do Sistema de Notificações
-- Criado em: 2025-01-16

-- ======================================
-- 1. CORRIGIR FUNÇÃO CREATE_NOTIFICATION
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
    
    -- Inserir notificação PRIMEIRO (sempre)
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
    
    -- Verificar se push notifications estão habilitadas (com fallback)
    SELECT COALESCE(push_notifications, true) INTO v_push_enabled
    FROM notification_settings
    WHERE tenant_id = p_tenant_id;
    
    -- Se não existir configuração, criar uma padrão
    IF v_push_enabled IS NULL THEN
        INSERT INTO notification_settings (
            tenant_id,
            push_notifications,
            email_notifications,
            appointment_created,
            appointment_updated,
            appointment_cancelled,
            appointment_completed,
            payment_received,
            system_alerts
        ) VALUES (
            p_tenant_id,
            true,
            true,
            true,
            true,
            true,
            true,
            true,
            true
        ) ON CONFLICT (tenant_id) DO NOTHING;
        
        v_push_enabled := true;
    END IF;
    
    -- Enviar push notification se habilitado (em background)
    IF v_push_enabled THEN
        BEGIN
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
        EXCEPTION
            WHEN OTHERS THEN
                -- Log do erro mas não falhar a criação da notificação
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
                    'push_notification_error',
                    p_title,
                    p_message,
                    p_data,
                    false,
                    SQLERRM
                );
        END;
    END IF;
    
    RETURN v_notification_id;
END;
$$;

-- ======================================
-- 2. CRIAR CONFIGURAÇÕES PADRÃO PARA TODOS OS TENANTS
-- ======================================

INSERT INTO notification_settings (
    tenant_id,
    push_notifications,
    email_notifications,
    appointment_created,
    appointment_updated,
    appointment_cancelled,
    appointment_completed,
    payment_received,
    system_alerts
)
SELECT 
    t.id,
    true,
    true,
    true,
    true,
    true,
    true,
    true,
    true
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM notification_settings ns WHERE ns.tenant_id = t.id
);

-- ======================================
-- 3. VALIDAÇÃO
-- ======================================

DO $$
DECLARE
    v_tenant_count INTEGER;
    v_settings_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_tenant_count FROM tenants;
    SELECT COUNT(*) INTO v_settings_count FROM notification_settings;
    
    RAISE NOTICE 'CORREÇÃO DO SISTEMA DE NOTIFICAÇÕES:';
    RAISE NOTICE '- Função create_notification corrigida';
    RAISE NOTICE '- Configurações padrão criadas para % tenants', v_settings_count;
    RAISE NOTICE '- Total de tenants: %', v_tenant_count;
    RAISE NOTICE '- Sistema pronto para push notifications e painel';
END $$;
