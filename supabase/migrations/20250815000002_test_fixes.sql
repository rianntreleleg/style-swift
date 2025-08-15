-- TESTE PARA VERIFICAR CORREÇÃO DO ERRO "record new has no field plan"

-- 1. Verificar se a tabela tenants tem os campos necessários
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'tenants' 
  AND column_name IN ('plan', 'plan_tier', 'payment_status', 'plan_status', 'payment_completed')
ORDER BY column_name;

-- 2. Verificar se a função create_simple_tenant existe e tem a assinatura correta
SELECT 
  proname, 
  pg_get_function_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE proname = 'create_simple_tenant' 
  AND n.nspname = 'public';

-- 3. Testar a criação de um tenant simples (substitua o UUID por um válido)
-- SELECT public.create_simple_tenant(
--   '00000000-0000-0000-0000-000000000000'::UUID,
--   'Test Tenant',
--   'test-tenant',
--   'professional',
--   'barber',
--   'Test Address',
--   '123456789'
-- );

-- 4. Verificar se o trigger de sincronização existe
SELECT 
  tgname as trigger_name,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgrelid = 'tenants'::regclass
  AND tgname = 'sync_tenant_plan_fields_trigger';

-- 5. Verificar dados de exemplo após a correção
SELECT 
  id,
  name,
  plan,
  plan_tier,
  payment_status,
  plan_status,
  payment_completed
FROM tenants 
ORDER BY created_at DESC 
LIMIT 5;