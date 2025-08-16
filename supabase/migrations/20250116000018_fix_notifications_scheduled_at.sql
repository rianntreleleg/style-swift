-- Corrigir coluna scheduled_at na tabela notifications
-- Criado em: 2025-01-16

-- ======================================
-- 1. VERIFICAR E CORRIGIR COLUNA SCHEDULED_AT
-- ======================================

-- Verificar se a coluna scheduled_at existe e tem valor padrão
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'scheduled_at'
    ) THEN
        -- Se existe, adicionar valor padrão se não tiver
        ALTER TABLE notifications ALTER COLUMN scheduled_at SET DEFAULT NOW();
        
        -- Atualizar registros existentes que têm scheduled_at NULL
        UPDATE notifications SET scheduled_at = NOW() WHERE scheduled_at IS NULL;
        
        -- Tornar a coluna NOT NULL
        ALTER TABLE notifications ALTER COLUMN scheduled_at SET NOT NULL;
    ELSE
        -- Se não existe, criar a coluna
        ALTER TABLE notifications ADD COLUMN scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- ======================================
-- 2. VERIFICAR OUTRAS COLUNAS NECESSÁRIAS
-- ======================================

-- Verificar se a coluna created_at existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Verificar se a coluna updated_at existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- ======================================
-- 3. RECRIAR FUNÇÃO CREATE_NOTIFICATION
-- ======================================

-- Função para criar notificação
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
    SELECT owner_id INTO v_owner_id
    FROM tenants
    WHERE id = p_tenant_id;
    
    -- Verificar se o tenant existe
    IF v_owner_id IS NULL THEN
        RAISE EXCEPTION 'Tenant não encontrado';
    END IF;
    
    -- Inserir notificação
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
    ) VALUES (
        p_tenant_id,
        v_owner_id,
        p_type,
        p_title,
        p_message,
        p_data,
        p_is_important,
        p_expires_at,
        NOW(),
        NOW(),
        NOW()
    ) RETURNING id INTO v_notification_id;
    
    RETURN v_notification_id;
END;
$$;

-- ======================================
-- 4. CONCEDER PERMISSÕES
-- ======================================

GRANT EXECUTE ON FUNCTION create_notification TO service_role;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;

-- ======================================
-- 5. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'COLUNA SCHEDULED_AT CORRIGIDA:';
    RAISE NOTICE '- Coluna scheduled_at verificada/criada com valor padrão';
    RAISE NOTICE '- Colunas created_at e updated_at verificadas';
    RAISE NOTICE '- Função create_notification atualizada';
    RAISE NOTICE '- Permissões concedidas';
END $$;
