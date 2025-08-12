-- Script para configurar variáveis de ambiente no Supabase
-- Execute este script no SQL Editor do Supabase Dashboard

-- Configurar variáveis de ambiente para Edge Functions
-- NOTA: Substitua os valores pelos seus reais

-- Stripe Secret Key
-- INSERT INTO supabase_functions.secrets (name, value) 
-- VALUES ('STRIPE_SECRET_KEY', 'SUA_STRIPE_SECRET_KEY_AQUI')
-- ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- Webhook Secret
-- INSERT INTO supabase_functions.secrets (name, value) 
-- VALUES ('SUBSCRIPTION_SECRET', 'SEU_WEBHOOK_SECRET_AQUI')
-- ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- Supabase URL
-- INSERT INTO supabase_functions.secrets (name, value) 
-- VALUES ('SUPABASE_URL', 'https://jsubmkwvqzddgppvgxiu.supabase.co')
-- ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- Service Role Key
-- INSERT INTO supabase_functions.secrets (name, value) 
-- VALUES ('SUPABASE_SERVICE_ROLE_KEY', 'SUA_SERVICE_ROLE_KEY_AQUI')
-- ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value;

-- Verificar se as variáveis foram configuradas
SELECT name, substring(value, 1, 10) || '...' as value_preview 
FROM supabase_functions.secrets 
WHERE name IN ('STRIPE_SECRET_KEY', 'SUBSCRIPTION_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY');
