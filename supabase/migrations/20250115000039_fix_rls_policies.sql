-- CORRIGIR POLÍTICAS RLS DA TABELA TENANTS
-- Garantir que as políticas permitem acesso correto

-- Habilitar RLS na tabela tenants
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que podem estar causando conflito
DROP POLICY IF EXISTS "Users can view own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can insert own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can update own tenants" ON public.tenants;
DROP POLICY IF EXISTS "Users can delete own tenants" ON public.tenants;

-- Criar políticas RLS corretas
-- Política para visualizar tenants (usuário pode ver seus próprios tenants)
CREATE POLICY "Users can view own tenants" ON public.tenants
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Política para inserir tenants (usuário pode criar tenants para si mesmo)
CREATE POLICY "Users can insert own tenants" ON public.tenants
    FOR INSERT
    WITH CHECK (auth.uid() = owner_id);

-- Política para atualizar tenants (usuário pode atualizar seus próprios tenants)
CREATE POLICY "Users can update own tenants" ON public.tenants
    FOR UPDATE
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- Política para deletar tenants (usuário pode deletar seus próprios tenants)
CREATE POLICY "Users can delete own tenants" ON public.tenants
    FOR DELETE
    USING (auth.uid() = owner_id);

-- Política especial para a função create_simple_tenant (permite inserção via RPC)
CREATE POLICY "Allow RPC function to insert tenants" ON public.tenants
    FOR INSERT
    WITH CHECK (true);

-- Política especial para webhooks do Stripe (permite atualização via webhook)
CREATE POLICY "Allow webhook updates" ON public.tenants
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Garantir que a função create_simple_tenant tem as permissões corretas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.tenants TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_simple_tenant(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- Comentário final
COMMENT ON TABLE public.tenants IS 'Políticas RLS corrigidas - acesso permitido via RPC e webhooks';
