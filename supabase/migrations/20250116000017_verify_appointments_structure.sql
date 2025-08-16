-- Verificar e corrigir estrutura da tabela appointments
-- Criado em: 2025-01-16

-- ======================================
-- 1. VERIFICAR E CORRIGIR COLUNAS DA TABELA APPOINTMENTS
-- ======================================

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

-- ======================================
-- 2. VERIFICAR SE AS TABELAS DEPENDENTES EXISTEM
-- ======================================

-- Verificar se a tabela customers existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'customers'
    ) THEN
        CREATE TABLE customers (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            email TEXT,
            phone TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Verificar se a tabela services existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'services'
    ) THEN
        CREATE TABLE services (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            price_cents INTEGER NOT NULL DEFAULT 0,
            duration_minutes INTEGER NOT NULL DEFAULT 30,
            description TEXT,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- Verificar se a tabela professionals existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'professionals'
    ) THEN
        CREATE TABLE professionals (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            bio TEXT,
            avatar_url TEXT,
            active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- ======================================
-- 3. CRIAR ÍNDICES SE NECESSÁRIO
-- ======================================

-- Índice para appointments por tenant
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_id ON appointments(tenant_id);

-- Índice para appointments por data
CREATE INDEX IF NOT EXISTS idx_appointments_start_time ON appointments(start_time);

-- Índice para appointments por status
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

-- ======================================
-- 4. VALIDAÇÃO
-- ======================================

DO $$
BEGIN
    RAISE NOTICE 'ESTRUTURA DA TABELA APPOINTMENTS VERIFICADA:';
    RAISE NOTICE '- Colunas customer_id, service_id, professional_id verificadas';
    RAISE NOTICE '- Colunas start_time e status verificadas';
    RAISE NOTICE '- Tabelas dependentes (customers, services, professionals) verificadas';
    RAISE NOTICE '- Índices criados';
END $$;
