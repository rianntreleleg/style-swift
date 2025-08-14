# Debug do Fluxo de Pagamento

## Problema Reportado
O usuário relata que após seguir o fluxo: "Entrar no site, assinar o plano, registrar na aplicação e quando tentei entrar / registrar minha página, entrou nessa página, querendo que eu refaça o pagamento."

## Passos para Debug

### 1. Aplicar Correções no Banco de Dados
Execute o script `MANUAL_PAYMENT_FIX.sql` no SQL Editor do Supabase Dashboard.

### 2. Verificar Console do Navegador
Abra o DevTools (F12) e verifique a aba Console para ver as mensagens de debug:

- `[AUTH] Plan selected from localStorage: ...`
- `[AUTH] User created: ...`
- `[AUTH] Existing payment found: ...`
- `[AUTH] Creating tenant with data: ...`
- `[AUTH] Tenant created: ...`
- `[AUTH] Associating payment to tenant...`
- `[ADMIN] Checking subscription for user: ...`
- `[ADMIN] Tenant data: ...`
- `[ADMIN] Subscription check: ...`

### 3. Verificar Tabelas no Supabase
Execute estas queries no SQL Editor para verificar o estado dos dados:

```sql
-- Verificar tenants
SELECT 
  id, 
  owner_id, 
  name, 
  plan, 
  plan_tier, 
  plan_status, 
  payment_completed,
  stripe_customer_id,
  stripe_subscription_id,
  created_at,
  updated_at
FROM public.tenants 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar subscribers
SELECT 
  id,
  user_id,
  email,
  stripe_customer_id,
  stripe_subscription_id,
  subscribed,
  subscription_tier,
  created_at,
  updated_at
FROM public.subscribers 
ORDER BY created_at DESC 
LIMIT 10;

-- Verificar usuários
SELECT 
  id,
  email,
  created_at,
  last_sign_in_at
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;
```

### 4. Verificar Logs do Webhook
No Supabase Dashboard, vá para:
- Edge Functions > stripe-webhook > Logs

Procure por mensagens como:
- `[WEBHOOK] Checkout completed for customer ...`
- `[WEBHOOK] Customer email: ...`
- `[WEBHOOK] User found: ...`
- `[WEBHOOK] Associating payment to existing user ...`

### 5. Fluxo Esperado vs Atual

#### Fluxo Correto:
1. Usuário acessa `/` → escolhe plano → paga
2. Stripe redireciona para `/auth?checkout=success&session_id=...`
3. Webhook processa pagamento e salva em `subscribers`
4. Usuário registra → Auth.tsx verifica pagamento existente
5. Tenant é criado com `payment_completed = true`
6. Usuário faz login → Admin.tsx verifica subscription
7. Acesso liberado ao painel

#### Possíveis Problemas:
1. **Webhook não está processando**: Verificar logs do webhook
2. **Pagamento não está sendo salvo**: Verificar tabela `subscribers`
3. **Tenant não está sendo criado corretamente**: Verificar tabela `tenants`
4. **Subscription check falhando**: Verificar lógica em Admin.tsx

### 6. Teste Manual
Para testar se o problema está no webhook ou na aplicação:

1. Crie um registro manual na tabela `subscribers`:
```sql
INSERT INTO public.subscribers (
  email,
  stripe_customer_id,
  stripe_subscription_id,
  subscribed,
  subscription_tier,
  updated_at
) VALUES (
  'seu-email@exemplo.com',
  'cus_test123',
  'sub_test123',
  true,
  'professional',
  now()
);
```

2. Tente registrar com esse email
3. Verifique se o acesso é liberado

### 7. Verificar Configuração do Stripe
- Verificar se o webhook está configurado corretamente no Stripe Dashboard
- Verificar se o `STRIPE_WEBHOOK_SECRET` está correto
- Verificar se os eventos estão sendo enviados

### 8. Comandos Úteis
```bash
# Deploy das Edge Functions
npx supabase functions deploy stripe-webhook
npx supabase functions deploy create-checkout-session
npx supabase functions deploy check-subscription

# Ver logs das funções
npx supabase functions logs stripe-webhook
```

## Próximos Passos
1. Execute o script manual no banco
2. Teste o fluxo completo
3. Verifique os logs de debug
4. Reporte os resultados para ajustes adicionais
