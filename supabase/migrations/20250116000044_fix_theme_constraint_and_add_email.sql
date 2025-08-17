-- Correção da constraint de temas e adição do campo email
-- Data: 2025-01-16
-- Objetivo: Corrigir a constraint de theme_variant e adicionar campo email

-- ======================================
-- 1. CORRIGIR CONSTRAINT DE THEME_VARIANT
-- ======================================

-- Remover a constraint antiga se existir
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_theme_variant_check;

-- Adicionar a nova constraint com todos os temas disponíveis
ALTER TABLE public.tenants ADD CONSTRAINT tenants_theme_variant_check 
CHECK (theme_variant IN ('barber', 'salon', 'barberLight', 'salonLight', 'default'));

-- ======================================
-- 2. ADICIONAR CAMPO EMAIL NA TABELA TENANTS
-- ======================================

-- Adicionar coluna email se não existir
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS email TEXT;

-- Criar índice para o campo email para melhor performance
CREATE INDEX IF NOT EXISTS idx_tenants_email ON public.tenants(email);

-- ======================================
-- 3. ATUALIZAR FUNÇÃO DE CRIAÇÃO DE TENANT
-- ======================================

-- Atualizar a função create_simple_tenant para incluir o email
CREATE OR REPLACE FUNCTION public.create_simple_tenant(
    p_owner_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_plan_tier TEXT DEFAULT 'essential',
    p_theme_variant TEXT DEFAULT 'barber',
    p_address TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL,
    p_email TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Inserir o tenant com todos os dados necessários incluindo email
    INSERT INTO public.tenants (
        owner_id,
        name,
        slug,
        plan_tier,
        theme_variant,
        address,
        phone,
        email,
        payment_status,
        created_at,
        updated_at
    )
    VALUES (
        p_owner_id,
        p_name,
        p_slug,
        p_plan_tier,
        p_theme_variant,
        p_address,
        p_phone,
        p_email,
        'pending',
        now(),
        now()
    )
    RETURNING id INTO v_tenant_id;

    -- Verificar se a inserção foi bem-sucedida
    IF v_tenant_id IS NULL THEN
        RAISE EXCEPTION 'Falha ao criar tenant: ID não foi retornado';
    END IF;

    RETURN v_tenant_id;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao criar tenant: %', SQLERRM;
END;
$$;

-- ======================================
-- 4. ATUALIZAR FUNÇÃO DE CRIAÇÃO PARA CHECKOUT
-- ======================================

-- Atualizar a função create_tenant_for_checkout para incluir o email
CREATE OR REPLACE FUNCTION create_tenant_for_checkout(
  p_user_id UUID,
  p_email TEXT,
  p_plan_tier TEXT,
  p_theme_variant TEXT DEFAULT 'barber'
)
RETURNS TABLE(
  tenant_id UUID,
  stripe_customer_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id UUID;
  v_customer_id TEXT;
BEGIN
  -- Criar tenant com payment_completed = false e email
  INSERT INTO public.tenants (
    owner_id,
    name,
    slug,
    theme_variant,
    plan_tier,
    plan_status,
    payment_completed,
    email,
    created_at,
    updated_at
  )
  VALUES (
    p_user_id,
    'Estabelecimento ' || split_part(p_email, '@', 1),
    'estabelecimento-' || extract(epoch from now())::text,
    p_theme_variant,
    p_plan_tier,
    'pending',
    false,
    p_email,
    now(),
    now()
  )
  RETURNING id INTO v_tenant_id;
  
  -- Gerar um customer_id temporário (será substituído pelo real do Stripe)
  v_customer_id := 'temp_' || v_tenant_id::text;
  
  -- Atualizar tenant com customer_id temporário
  UPDATE public.tenants 
  SET stripe_customer_id = v_customer_id
  WHERE id = v_tenant_id;
  
  RETURN QUERY SELECT v_tenant_id, v_customer_id;
END;
$$;

-- ======================================
-- 5. CONCEDER PERMISSÕES
-- ======================================

-- Garantir que as funções têm as permissões corretas
GRANT EXECUTE ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION create_tenant_for_checkout(UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION create_tenant_for_checkout(UUID, TEXT, TEXT, TEXT) TO anon;

-- ======================================
-- 6. VALIDAÇÃO FINAL
-- ======================================

DO $$
DECLARE
    v_theme_count INTEGER;
    v_email_count INTEGER;
BEGIN
    -- Verificar quantos tenants têm email
    SELECT COUNT(*) INTO v_email_count 
    FROM public.tenants 
    WHERE email IS NOT NULL;
    
    -- Verificar quantos tenants têm temas válidos
    SELECT COUNT(*) INTO v_theme_count 
    FROM public.tenants 
    WHERE theme_variant IN ('barber', 'salon', 'barberLight', 'salonLight', 'default');
    
    RAISE NOTICE 'CORREÇÕES APLICADAS:';
    RAISE NOTICE '- Constraint de theme_variant atualizada com novos temas';
    RAISE NOTICE '- Campo email adicionado à tabela tenants';
    RAISE NOTICE '- Funções de criação de tenant atualizadas';
    RAISE NOTICE '- Tenants com email: %', v_email_count;
    RAISE NOTICE '- Tenants com temas válidos: %', v_theme_count;
    RAISE NOTICE '- Sistema pronto para novos registros com email';
END $$;
