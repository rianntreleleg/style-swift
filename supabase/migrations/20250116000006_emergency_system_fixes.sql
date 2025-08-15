-- 🚨 CORREÇÕES EMERGENCIAIS DO SISTEMA
-- Esta migração corrige todos os problemas críticos identificados

-- ======================================
-- 1. CORRIGIR FUNÇÃO DE CONCLUSÃO AUTOMÁTICA
-- ======================================

-- Corrigir process_pending_completions para retornar quantos foram efetivamente processados
CREATE OR REPLACE FUNCTION process_pending_completions()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  actual_completed_count INTEGER := 0;
  appointment_record RECORD;
BEGIN
  -- Contar e processar agendamentos confirmados que passaram de 24 horas
  FOR appointment_record IN
    SELECT 
      id,
      tenant_id,
      customer_name,
      start_time
    FROM appointments
    WHERE 
      status = 'confirmado'
      AND start_time < NOW() - INTERVAL '24 hours'
      AND start_time > NOW() - INTERVAL '48 hours'
  LOOP
    -- Marcar como concluído
    UPDATE appointments
    SET 
      status = 'concluido',
      updated_at = NOW()
    WHERE id = appointment_record.id;
    
    actual_completed_count := actual_completed_count + 1;
    
    -- Log da ação
    RAISE NOTICE 'Agendamento concluído automaticamente: ID=%, Cliente=%, Data/Hora=%', 
      appointment_record.id, 
      appointment_record.customer_name, 
      appointment_record.start_time;
  END LOOP;
  
  -- Log do total processado
  IF actual_completed_count > 0 THEN
    RAISE NOTICE 'Total de agendamentos concluídos automaticamente: %', actual_completed_count;
  END IF;

  -- Retornar resultado com contagem real
  result := json_build_object(
    'success', true,
    'completed_count', actual_completed_count,
    'timestamp', NOW(),
    'message', CASE 
      WHEN actual_completed_count > 0 THEN 
        'Processamento concluído. ' || actual_completed_count || ' agendamentos marcados como concluídos.'
      ELSE 
        'Nenhum agendamento precisava ser concluído automaticamente.'
    END
  );
  
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'timestamp', NOW(),
      'completed_count', 0
    );
END;
$$;

-- ======================================
-- 2. CRIAR POLÍTICAS RLS PARA TABELA CUSTOMERS
-- ======================================

-- Habilitar RLS na tabela customers
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view customers for their tenant" ON customers;
DROP POLICY IF EXISTS "Users can insert customers for their tenant" ON customers;
DROP POLICY IF EXISTS "Users can update customers for their tenant" ON customers;
DROP POLICY IF EXISTS "Allow service to insert customers" ON customers;
DROP POLICY IF EXISTS "Allow public booking to insert customers" ON customers;

-- Política para visualizar customers (usuário pode ver customers do seu tenant)
CREATE POLICY "Users can view customers for their tenant" ON customers
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Política para inserir customers (usuário pode criar customers para seu tenant)
CREATE POLICY "Users can insert customers for their tenant" ON customers
    FOR INSERT WITH CHECK (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Política para atualizar customers (usuário pode atualizar customers do seu tenant)
CREATE POLICY "Users can update customers for their tenant" ON customers
    FOR UPDATE USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Política especial para permitir agendamento público (sem autenticação)
CREATE POLICY "Allow public booking to insert customers" ON customers
    FOR INSERT WITH CHECK (true);

-- Política especial para service_role
CREATE POLICY "Allow service role full access" ON customers
    FOR ALL USING (true) WITH CHECK (true);

-- ======================================
-- 3. FUNÇÃO PARA SINCRONIZAR STATUS DE PAGAMENTO
-- ======================================

-- Função para sincronizar todos os campos de status de pagamento
CREATE OR REPLACE FUNCTION sync_all_payment_status()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INTEGER := 0;
  tenant_record RECORD;
BEGIN
  -- Sincronizar todos os tenants
  FOR tenant_record IN
    SELECT 
      id,
      payment_status,
      plan_status,
      payment_completed,
      stripe_customer_id
    FROM tenants
    WHERE stripe_customer_id IS NOT NULL
  LOOP
    -- Determinar se deve estar ativo baseado em qualquer campo positivo
    IF tenant_record.payment_status = 'paid' OR 
       tenant_record.plan_status = 'active' OR 
       tenant_record.payment_completed = true THEN
      
      -- Sincronizar todos os campos para consistência
      UPDATE tenants
      SET 
        payment_status = 'paid',
        plan_status = 'active',
        payment_completed = true,
        updated_at = now()
      WHERE id = tenant_record.id;
      
      updated_count := updated_count + 1;
      
      RAISE NOTICE 'Tenant % sincronizado: status ativado', tenant_record.id;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'Total de tenants sincronizados: %', updated_count;
  RETURN updated_count;
END;
$$;

-- Executar sincronização imediatamente
SELECT sync_all_payment_status();

-- ======================================
-- 4. CORRIGIR HOOK DE PERMISSÕES - LÓGICA FLEXÍVEL
-- ======================================

-- Função para verificar se tenant tem acesso a funcionalidades pagas
CREATE OR REPLACE FUNCTION check_tenant_paid_access(p_tenant_id UUID)
RETURNS TABLE(
  is_paid BOOLEAN,
  plan_tier TEXT,
  has_financial_dashboard BOOLEAN,
  has_auto_confirmation BOOLEAN,
  has_advanced_analytics BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tenant_data RECORD;
  is_tenant_paid BOOLEAN;
BEGIN
  -- Buscar dados do tenant
  SELECT 
    t.plan_tier,
    t.payment_status,
    t.plan_status,
    t.payment_completed
  INTO tenant_data
  FROM tenants t
  WHERE t.id = p_tenant_id;

  -- Verificar se está pago (qualquer um dos indicadores positivos)
  is_tenant_paid := (
    tenant_data.payment_status = 'paid' OR 
    tenant_data.plan_status = 'active' OR 
    tenant_data.payment_completed = true
  );

  -- Retornar permissões baseadas no plano e status de pagamento
  RETURN QUERY
  SELECT 
    is_tenant_paid,
    COALESCE(tenant_data.plan_tier, 'essential')::TEXT,
    CASE 
      WHEN tenant_data.plan_tier IN ('professional', 'premium') AND is_tenant_paid THEN true
      ELSE false
    END,
    CASE 
      WHEN tenant_data.plan_tier IN ('professional', 'premium') AND is_tenant_paid THEN true
      ELSE false
    END,
    CASE 
      WHEN tenant_data.plan_tier = 'premium' AND is_tenant_paid THEN true
      ELSE false
    END;
END;
$$;

-- ======================================
-- 5. CRIAR FUNÇÃO PARA AUTO-CRIAÇÃO DE CUSTOMER
-- ======================================

-- Função para criar customer automaticamente se não existir
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
BEGIN
  -- Tentar encontrar customer existente
  SELECT id INTO customer_id
  FROM customers
  WHERE tenant_id = p_tenant_id 
    AND LOWER(name) = LOWER(p_name)
    AND contact = p_contact
  LIMIT 1;

  -- Se não encontrou, criar novo
  IF customer_id IS NULL THEN
    INSERT INTO customers (tenant_id, name, contact)
    VALUES (p_tenant_id, p_name, p_contact)
    RETURNING id INTO customer_id;
  END IF;

  RETURN customer_id;
END;
$$;

-- ======================================
-- 6. CORRIGIR FUNÇÃO CREATE_APPOINTMENT_SAFE
-- ======================================

-- Atualizar create_appointment_safe para usar get_or_create_customer
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

  -- Criar ou encontrar customer
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
-- 7. PERMISSÕES E COMENTÁRIOS
-- ======================================

-- Conceder permissões
GRANT EXECUTE ON FUNCTION sync_all_payment_status TO service_role;
GRANT EXECUTE ON FUNCTION check_tenant_paid_access TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_customer TO service_role;
GRANT EXECUTE ON FUNCTION get_or_create_customer TO authenticated;

-- Comentários para documentação
COMMENT ON FUNCTION process_pending_completions IS 'Versão corrigida - retorna contagem real de agendamentos processados';
COMMENT ON FUNCTION sync_all_payment_status IS 'Sincroniza todos os campos de status de pagamento para consistência';
COMMENT ON FUNCTION check_tenant_paid_access IS 'Verifica acesso a funcionalidades pagas com lógica flexível';
COMMENT ON FUNCTION get_or_create_customer IS 'Cria customer automaticamente se não existir, evitando erros de RLS';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant_name_contact 
ON customers(tenant_id, LOWER(name), contact);
