-- CORREÇÃO DA FUNÇÃO create_simple_tenant
-- Garantir que a função existe e está funcionando corretamente

-- Remover a função se existir para recriar
DROP FUNCTION IF EXISTS public.create_simple_tenant(
    p_owner_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_plan_tier TEXT,
    p_theme_variant TEXT,
    p_address TEXT,
    p_phone TEXT
);

-- Recriar a função com SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_simple_tenant(
    p_owner_id UUID,
    p_name TEXT,
    p_slug TEXT,
    p_plan_tier TEXT DEFAULT 'essential',
    p_theme_variant TEXT DEFAULT 'barber',
    p_address TEXT DEFAULT NULL,
    p_phone TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_tenant_id UUID;
BEGIN
    -- Inserir o tenant com todos os dados necessários
    INSERT INTO public.tenants (
        owner_id,
        name,
        slug,
        plan_tier,
        theme_variant,
        address,
        phone,
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

-- Garantir que a função tem as permissões corretas
GRANT EXECUTE ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon;

-- Comentário na função
COMMENT ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) IS 'Função para criar tenant com dados mínimos necessários';
