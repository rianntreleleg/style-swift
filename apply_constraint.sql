-- Aplicar constraint para limitar um estabelecimento por usuário
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- Adicionar constraint única para owner_id na tabela tenants
-- Isso garante que cada usuário só pode ter um estabelecimento
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_owner_id_unique UNIQUE (owner_id);

-- Comentário explicativo
COMMENT ON CONSTRAINT tenants_owner_id_unique ON public.tenants IS 'Garante que cada usuário só pode ter um estabelecimento';
