-- Melhorar tratamento de clientes para permitir múltiplos agendamentos
-- Data: 2025-01-16

-- ======================================
-- 1. MELHORAR FUNÇÃO GET_OR_CREATE_CUSTOMER
-- ======================================

-- Atualizar função para ser mais flexível com nomes de clientes
CREATE OR REPLACE FUNCTION get_or_create_customer(
  p_tenant_id UUID,
  p_name TEXT,
  p_contact TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_id UUID;
  existing_customer_id UUID;
BEGIN
  -- Primeiro, tentar encontrar por telefone (mais confiável)
  SELECT id INTO existing_customer_id
  FROM customers
  WHERE tenant_id = p_tenant_id 
    AND contact = p_contact
  LIMIT 1;

  -- Se encontrou por telefone, usar esse customer
  IF existing_customer_id IS NOT NULL THEN
    customer_id := existing_customer_id;
    
    -- Opcional: atualizar o nome se for diferente (para manter dados atualizados)
    UPDATE customers 
    SET name = p_name, updated_at = NOW()
    WHERE id = customer_id 
    AND LOWER(name) != LOWER(p_name);
  ELSE
    -- Se não encontrou, criar novo customer
    INSERT INTO customers (tenant_id, name, contact)
    VALUES (p_tenant_id, p_name, p_contact)
    RETURNING id INTO customer_id;
  END IF;

  RETURN customer_id;
END;
$$;

-- ======================================
-- 2. CRIAR FUNÇÃO PARA BUSCAR CLIENTE POR TELEFONE
-- ======================================

-- Função para buscar cliente apenas por telefone
CREATE OR REPLACE FUNCTION find_customer_by_phone(
  p_tenant_id UUID,
  p_contact TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_id UUID;
BEGIN
  SELECT id INTO customer_id
  FROM customers
  WHERE tenant_id = p_tenant_id 
    AND contact = p_contact
  LIMIT 1;

  RETURN customer_id;
END;
$$;

-- ======================================
-- 3. CRIAR FUNÇÃO PARA CRIAR CLIENTE SEMPRE NOVO
-- ======================================

-- Função para sempre criar um novo customer (útil para casos especiais)
CREATE OR REPLACE FUNCTION create_new_customer(
  p_tenant_id UUID,
  p_name TEXT,
  p_contact TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  customer_id UUID;
BEGIN
  INSERT INTO customers (tenant_id, name, contact)
  VALUES (p_tenant_id, p_name, p_contact)
  RETURNING id INTO customer_id;

  RETURN customer_id;
END;
$$;

-- ======================================
-- 4. MELHORAR FUNÇÃO CREATE_APPOINTMENT_SAFE
-- ======================================

-- Atualizar create_appointment_safe para usar a nova lógica
CREATE OR REPLACE FUNCTION create_appointment_safe(
  p_tenant_id UUID,
  p_professional_id UUID,
  p_service_id UUID,
  p_customer_name TEXT,
  p_customer_phone TEXT,
  p_customer_email TEXT,
  p_start_time TIMESTAMP WITH TIME ZONE,
  p_end_time TIMESTAMP WITH TIME ZONE,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_conflict BOOLEAN;
  new_appointment appointments%ROWTYPE;
  customer_id UUID;
BEGIN
  -- Verificar se há conflitos
  SELECT check_appointment_conflicts(
    p_tenant_id,
    p_professional_id,
    p_start_time,
    p_end_time
  ) INTO has_conflict;

  -- Se há conflito, retornar erro
  IF has_conflict THEN
    RETURN json_build_object(
      'success', false,
      'error', 'CONFLICT',
      'message', 'Já existe um agendamento para este profissional neste horário.'
    );
  END IF;

  -- Criar ou encontrar customer usando a nova lógica
  SELECT get_or_create_customer(
    p_tenant_id,
    p_customer_name,
    p_customer_phone
  ) INTO customer_id;

  -- Inserir o agendamento
  INSERT INTO appointments (
    tenant_id,
    professional_id,
    service_id,
    customer_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_contact,
    start_time,
    end_time,
    notes,
    status
  ) VALUES (
    p_tenant_id,
    p_professional_id,
    p_service_id,
    customer_id,
    p_customer_name,
    p_customer_phone,
    p_customer_email,
    p_customer_phone,
    p_start_time,
    p_end_time,
    p_notes,
    'agendado'
  ) RETURNING * INTO new_appointment;

  -- Retornar sucesso
  RETURN json_build_object(
    'success', true,
    'appointment_id', new_appointment.id,
    'customer_id', customer_id,
    'message', 'Agendamento criado com sucesso.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', 'DATABASE_ERROR',
      'message', 'Erro interno do banco de dados: ' || SQLERRM
    );
END;
$$;

-- ======================================
-- 5. PERMISSÕES E COMENTÁRIOS
-- ======================================

-- Conceder permissões
GRANT EXECUTE ON FUNCTION get_or_create_customer TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_customer TO authenticated;
GRANT EXECUTE ON FUNCTION find_customer_by_phone TO service_role;
GRANT EXECUTE ON FUNCTION find_customer_by_phone TO authenticated;
GRANT EXECUTE ON FUNCTION create_new_customer TO service_role;
GRANT EXECUTE ON FUNCTION create_new_customer TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION get_or_create_customer IS 'Busca cliente por telefone ou cria novo - permite múltiplos agendamentos do mesmo cliente';
COMMENT ON FUNCTION find_customer_by_phone IS 'Busca cliente apenas por telefone';
COMMENT ON FUNCTION create_new_customer IS 'Sempre cria um novo cliente (útil para casos especiais)';

-- ======================================
-- 6. VERIFICAR SE A CONSTRAINT FOI REMOVIDA
-- ======================================

-- Verificar se ainda existe alguma constraint única problemática
DO $$
DECLARE
    constraint_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO constraint_count
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid
    WHERE c.conrelid = 'public.customers'::regclass
    AND c.contype = 'u'
    AND a.attname = 'contact'
    AND a.attnum = ANY(c.conkey);

    IF constraint_count > 0 THEN
        RAISE NOTICE 'ATENÇÃO: Ainda existem % constraints únicas no campo contact', constraint_count;
    ELSE
        RAISE NOTICE 'SUCESSO: Nenhuma constraint única encontrada no campo contact';
    END IF;
END $$;
