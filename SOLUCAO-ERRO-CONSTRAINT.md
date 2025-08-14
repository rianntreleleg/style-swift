# Solução para o Erro de Constraint na Tabela Tenants

## Problema Identificado

O erro que estava ocorrendo era:

```
new row for relation "tenants" violates check constraint "tenants_plan_status_check"
```

## Causa do Problema

Quando um usuário tentava se registrar, o sistema estava tentando inserir um novo registro na tabela `tenants` com o valor `'pending'` para o campo `plan_status`, mas a constraint `tenants_plan_status_check` não permitia este valor.

## Correções Realizadas

### 1. Modificação no Código Frontend

No arquivo `src/pages/Auth.tsx`, alteramos a linha que define o valor de `plan_status` de:

```typescript
plan_status: existingPayment ? 'active' : 'pending',
```

Para:

```typescript
plan_status: existingPayment ? 'active' : 'unpaid',
```

Esta alteração garante que apenas valores permitidos pela constraint sejam utilizados.

### 2. Script SQL para Corrigir as Constraints

Criamos um script SQL (`corrigir-constraints.sql`) que deve ser executado no SQL Editor do Supabase para corrigir as constraints da tabela `tenants`:

```sql
-- Corrigir a constraint de plan_status
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_status_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_status_check
  CHECK (plan_status IN ('active', 'canceled', 'past_due', 'unpaid', 'pending'));

-- Corrigir a constraint de plan
ALTER TABLE public.tenants DROP CONSTRAINT IF EXISTS tenants_plan_check;
ALTER TABLE public.tenants ADD CONSTRAINT tenants_plan_check
  CHECK (plan IN ('essential', 'professional', 'premium'));
```

## Como Aplicar as Correções

1. **Atualização do Código Frontend**:
   - A alteração no arquivo `src/pages/Auth.tsx` já foi realizada.
   - Faça o deploy da aplicação com esta alteração.

2. **Execução do Script SQL**:
   - Acesse o Supabase Dashboard do seu projeto.
   - Vá para a seção "SQL Editor".
   - Cole o conteúdo do arquivo `corrigir-constraints.sql`.
   - Execute o script para atualizar as constraints.

## Verificação

Após aplicar as correções, você pode verificar se as constraints foram atualizadas corretamente executando a seguinte consulta no SQL Editor:

```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conname IN ('tenants_plan_status_check', 'tenants_plan_check');
```

A constraint `tenants_plan_status_check` deve agora permitir os valores: 'active', 'canceled', 'past_due', 'unpaid' e 'pending'.

A constraint `tenants_plan_check` deve permitir os valores: 'essential', 'professional' e 'premium'.