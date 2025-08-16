-- Corrigir estrutura da tabela notifications
-- Criado em: 2025-01-16

-- ======================================
-- 1. VERIFICAR E CORRIGIR ESTRUTURA DA TABELA NOTIFICATIONS
-- ======================================

-- Adicionar coluna user_id se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE notifications ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Adicionar coluna data se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'data'
    ) THEN
        ALTER TABLE notifications ADD COLUMN data JSONB DEFAULT '{}';
    END IF;
END $$;

-- Adicionar coluna is_important se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'is_important'
    ) THEN
        ALTER TABLE notifications ADD COLUMN is_important BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Adicionar coluna read_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
    END IF;
END $$;

-- Adicionar coluna expires_at se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'expires_at'
    ) THEN
        ALTER TABLE notifications ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Adicionar coluna is_read se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'is_read'
    ) THEN
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT false;
    END IF;
END $$;

-- ======================================
-- 2. CRIAR ÍNDICES SE NÃO EXISTIREM
-- ======================================

-- Índice para tenant_id
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);

-- Índice para user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- Índice para type
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Índice para created_at
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Índice para notificações não lidas
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(tenant_id, is_read) WHERE is_read = false;

-- Índice para notificações importantes
CREATE INDEX IF NOT EXISTS idx_notifications_important ON notifications(tenant_id, is_important) WHERE is_important = true;

-- ======================================
-- 3. HABILITAR RLS
-- ======================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ======================================
-- 4. CRIAR POLÍTICAS RLS
-- ======================================

-- Política para usuários do tenant visualizarem suas notificações
DROP POLICY IF EXISTS "Tenant users can view their notifications" ON notifications;
CREATE POLICY "Tenant users can view their notifications" ON notifications
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Política para o sistema gerenciar notificações
DROP POLICY IF EXISTS "System can manage notifications" ON notifications;
CREATE POLICY "System can manage notifications" ON notifications
    FOR ALL USING (true);

-- ======================================
-- 5. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'ESTRUTURA DA TABELA NOTIFICATIONS CORRIGIDA:';
    RAISE NOTICE '- Colunas adicionadas conforme necessário';
    RAISE NOTICE '- Índices criados';
    RAISE NOTICE '- RLS habilitado';
    RAISE NOTICE '- Políticas criadas';
END $$;
