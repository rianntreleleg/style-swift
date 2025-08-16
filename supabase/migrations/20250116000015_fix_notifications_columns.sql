-- Corrigir colunas da tabela notifications
-- Criado em: 2025-01-16

-- ======================================
-- 1. VERIFICAR E CORRIGIR COLUNAS DA TABELA NOTIFICATIONS
-- ======================================

-- Adicionar coluna title se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'title'
    ) THEN
        ALTER TABLE notifications ADD COLUMN title TEXT NOT NULL DEFAULT 'Notificação';
    END IF;
END $$;

-- Adicionar coluna message se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'message'
    ) THEN
        ALTER TABLE notifications ADD COLUMN message TEXT NOT NULL DEFAULT 'Nova notificação';
    END IF;
END $$;

-- Adicionar coluna type se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE notifications ADD COLUMN type TEXT NOT NULL DEFAULT 'system_alert';
    END IF;
END $$;

-- Adicionar constraint para type se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'notifications_type_check'
    ) THEN
        ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
        CHECK (type IN ('appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_completed', 'payment_received', 'system_alert'));
    END IF;
END $$;

-- ======================================
-- 2. VERIFICAR E CORRIGIR COLUNAS DA TABELA NOTIFICATION_SETTINGS
-- ======================================

-- Verificar se a tabela notification_settings existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'notification_settings'
    ) THEN
        CREATE TABLE notification_settings (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
            email_notifications BOOLEAN DEFAULT true,
            push_notifications BOOLEAN DEFAULT true,
            appointment_created BOOLEAN DEFAULT true,
            appointment_updated BOOLEAN DEFAULT true,
            appointment_cancelled BOOLEAN DEFAULT true,
            appointment_completed BOOLEAN DEFAULT true,
            payment_received BOOLEAN DEFAULT true,
            system_alerts BOOLEAN DEFAULT true,
            quiet_hours_start TIME DEFAULT '22:00',
            quiet_hours_end TIME DEFAULT '08:00',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- ======================================
-- 3. RECRIAR FUNÇÕES SE NECESSÁRIO
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
    RAISE NOTICE 'ESTRUTURA DA TABELA NOTIFICATIONS CORRIGIDA:';
    RAISE NOTICE '- Colunas title, message e type verificadas/criadas';
    RAISE NOTICE '- Tabela notification_settings verificada/criada';
    RAISE NOTICE '- Função create_notification recriada';
    RAISE NOTICE '- Permissões concedidas';
END $$;
