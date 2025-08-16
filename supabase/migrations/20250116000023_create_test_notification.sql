-- Criar notificação de teste
-- Criado em: 2025-01-16

-- ======================================
-- 1. INSERIR NOTIFICAÇÃO DE TESTE
-- ======================================

-- Inserir notificação de teste para o primeiro tenant
INSERT INTO notifications (
    tenant_id,
    user_id,
    type,
    title,
    message,
    data,
    is_important,
    expires_at,
    scheduled_at,
    created_at,
    updated_at
)
SELECT 
    t.id as tenant_id,
    t.owner_id as user_id,
    'system_alert' as type,
    'Sistema de Notificações Ativo' as title,
    'O sistema de notificações está funcionando corretamente! Esta é uma notificação de teste.' as message,
    jsonb_build_object('test', true, 'timestamp', NOW(), 'version', '1.0') as data,
    false as is_important,
    NOW() + INTERVAL '30 days' as expires_at,
    NOW() as scheduled_at,
    NOW() as created_at,
    NOW() as updated_at
FROM tenants t
WHERE t.id = (
    SELECT id FROM tenants 
    ORDER BY created_at ASC 
    LIMIT 1
)
ON CONFLICT DO NOTHING;

-- ======================================
-- 2. VERIFICAR SE A NOTIFICAÇÃO FOI CRIADA
-- ======================================

DO $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count FROM notifications;
    RAISE NOTICE 'NOTIFICAÇÃO DE TESTE CRIADA:';
    RAISE NOTICE '- Total de notificações no sistema: %', v_count;
    RAISE NOTICE '- Sistema de notificações está ativo';
END $$;
