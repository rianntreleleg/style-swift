-- Criar notificação de teste
-- Data: 2025-08-16

-- ======================================
-- INSERIR NOTIFICAÇÃO DE TESTE
-- ======================================

DO $$
DECLARE
    v_tenant_id UUID;
    v_user_id UUID;
BEGIN
    -- Pegar o primeiro tenant e usuário
    SELECT t.id, t.owner_id INTO v_tenant_id, v_user_id 
    FROM tenants t 
    LIMIT 1;
    
    IF v_tenant_id IS NOT NULL AND v_user_id IS NOT NULL THEN
        -- Inserir notificação de teste
        INSERT INTO notifications (
            tenant_id,
            user_id,
            type,
            title,
            message,
            data,
            is_important,
            is_read
        ) VALUES (
            v_tenant_id,
            v_user_id,
            'system_alert',
            '🎉 Sistema de Notificações Restaurado!',
            'O sistema de notificações foi restaurado com sucesso. Agora você pode receber notificações em tempo real.',
            jsonb_build_object(
                'test', true, 
                'timestamp', NOW(),
                'version', '2.0'
            ),
            true,
            false
        );
        
        RAISE NOTICE 'NOTIFICAÇÃO DE TESTE CRIADA:';
        RAISE NOTICE '- Tenant ID: %', v_tenant_id;
        RAISE NOTICE '- User ID: %', v_user_id;
        RAISE NOTICE '- Status: Sucesso';
    ELSE
        RAISE NOTICE 'ERRO: Não foi possível encontrar tenant ou usuário';
    END IF;
END $$;
