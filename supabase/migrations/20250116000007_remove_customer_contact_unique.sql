-- Remover constraint única do telefone do cliente
-- Permite que o mesmo cliente faça múltiplos agendamentos

-- Remover a constraint única que impede múltiplos agendamentos do mesmo cliente
ALTER TABLE public.customers 
DROP CONSTRAINT IF EXISTS customers_tenant_id_contact_key;

-- Remover a constraint única se existir com nome diferente
DO $$
BEGIN
    -- Verificar se existe alguma constraint única envolvendo tenant_id e contact
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname LIKE '%customers%' 
        AND conname LIKE '%contact%' 
        AND contype = 'u'
    ) THEN
        -- Encontrar e remover a constraint
        EXECUTE (
            'ALTER TABLE public.customers DROP CONSTRAINT ' || 
            (SELECT conname FROM pg_constraint 
             WHERE conname LIKE '%customers%' 
             AND conname LIKE '%contact%' 
             AND contype = 'u' 
             LIMIT 1)
        );
    END IF;
END $$;

-- Criar índice simples para performance (sem constraint única)
CREATE INDEX IF NOT EXISTS idx_customers_tenant_contact 
ON public.customers(tenant_id, contact);

-- Comentário explicativo
COMMENT ON INDEX idx_customers_tenant_contact IS 'Índice para busca por tenant_id e contact, sem constraint única - permite múltiplos agendamentos do mesmo cliente';

-- Verificar se a remoção foi bem-sucedida
DO $$
DECLARE
    constraint_exists BOOLEAN;
BEGIN
    -- Verificar se ainda existe alguma constraint única no contact
    SELECT EXISTS (
        SELECT 1 FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid
        WHERE c.conrelid = 'public.customers'::regclass
        AND c.contype = 'u'
        AND a.attname = 'contact'
        AND a.attnum = ANY(c.conkey)
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        RAISE NOTICE 'Ainda existem constraints únicas no campo contact - verificar manualmente';
    ELSE
        RAISE NOTICE 'Constraint única do contact removida com sucesso';
    END IF;
END $$;
