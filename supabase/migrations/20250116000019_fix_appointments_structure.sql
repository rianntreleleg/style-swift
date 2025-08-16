-- Verificar e corrigir estrutura completa da tabela appointments
-- Criado em: 2025-01-16

-- ======================================
-- 1. VERIFICAR SE A TABELA APPOINTMENTS EXISTE
-- ======================================

-- Verificar se a tabela appointments existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'appointments'
    ) THEN
        CREATE TABLE appointments (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
            service_id UUID REFERENCES services(id) ON DELETE CASCADE,
            professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
            start_time TIMESTAMPTZ NOT NULL,
            end_time TIMESTAMPTZ,
            status TEXT NOT NULL DEFAULT 'pending',
            notes TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- ======================================
-- 2. VERIFICAR E CORRIGIR COLUNAS EXISTENTES
-- ======================================

-- Verificar se a coluna tenant_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar se a coluna customer_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'customer_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN customer_id UUID REFERENCES customers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar se a coluna service_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'service_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN service_id UUID REFERENCES services(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar se a coluna professional_id existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'professional_id'
    ) THEN
        ALTER TABLE appointments ADD COLUMN professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Verificar se a coluna start_time existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'start_time'
    ) THEN
        ALTER TABLE appointments ADD COLUMN start_time TIMESTAMPTZ NOT NULL DEFAULT NOW();
    END IF;
END $$;

-- Verificar se a coluna end_time existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'end_time'
    ) THEN
        ALTER TABLE appointments ADD COLUMN end_time TIMESTAMPTZ;
    END IF;
END $$;

-- Verificar se a coluna status existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE appointments ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    END IF;
END $$;

-- Verificar se a coluna notes existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE appointments ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Verificar se a coluna created_at existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'created_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Verificar se a coluna updated_at existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'appointments' 
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE appointments ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ======================================
-- 3. CRIAR ÍNDICES SE NECESSÁRIO
-- ======================================

-- Índice para appointments por tenant
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);

-- Índice para appointments por customer
CREATE INDEX IF NOT EXISTS idx_appointments_customer_id ON appointments(customer_id);

-- Índice para appointments por service
CREATE INDEX IF NOT EXISTS idx_appointments_service_id ON appointments(service_id);

-- Índice para appointments por professional
CREATE INDEX IF NOT EXISTS idx_appointments_professional_id ON appointments(professional_id);

-- Índice para appointments por data
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

-- Índice para appointments por status
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ======================================
-- 4. HABILITAR RLS
-- ======================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- ======================================
-- 5. CRIAR POLÍTICAS RLS
-- ======================================

-- Política para usuários do tenant visualizarem seus agendamentos
DROP POLICY IF EXISTS "Tenant users can view their appointments" ON appointments;
CREATE POLICY "Tenant users can view their appointments" ON appointments
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Política para usuários do tenant gerenciarem seus agendamentos
DROP POLICY IF EXISTS "Tenant users can manage their appointments" ON appointments;
CREATE POLICY "Tenant users can manage their appointments" ON appointments
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- ======================================
-- 6. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'ESTRUTURA DA TABELA APPOINTMENTS VERIFICADA:';
    RAISE NOTICE '- Tabela appointments verificada/criada';
    RAISE NOTICE '- Todas as colunas necessárias verificadas';
    RAISE NOTICE '- Índices criados';
    RAISE NOTICE '- RLS habilitado';
    RAISE NOTICE '- Políticas criadas';
END $$;
