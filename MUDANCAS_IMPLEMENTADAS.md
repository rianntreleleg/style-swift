# Mudanças Implementadas - Limitação de Estabelecimentos

## Resumo das Alterações

Implementamos as seguintes mudanças para garantir que cada usuário só possa ter um estabelecimento e simplificar o processo de registro:

### 1. Constraint no Banco de Dados
- **Arquivo**: `supabase/migrations/20250115000008_limit_one_tenant_per_user.sql`
- **Arquivo**: `apply_constraint.sql` (para aplicação manual)
- **Mudança**: Adicionada constraint única `tenants_owner_id_unique` na tabela `tenants` para o campo `owner_id`
- **Resultado**: Cada usuário só pode ter um estabelecimento

### 2. Simplificação do Formulário de Registro (`src/pages/Auth.tsx`)

#### Campos Removidos:
- **Slug**: Removido campo de entrada manual do slug
- **Tipo de Estabelecimento**: Removida seleção manual do tema (barber/salon)

#### Campos Mantidos:
- **Nome do Estabelecimento**: Mantido para edição
- **Logo**: Mantido como opcional
- **Horários de Funcionamento**: Mantidos

#### Novas Funcionalidades:
- **Geração Automática de Slug**: O slug é gerado automaticamente baseado no nome do estabelecimento
- **Tema Padrão**: Todos os estabelecimentos são criados com tema "barber" por padrão
- **Mensagem Informativa**: Adicionada mensagem explicando a limitação de um estabelecimento por usuário

### 3. Atualização do Painel Administrativo (`src/pages/Admin.tsx`)

#### Seção "Estabelecimento" Atualizada:
- **Removida**: Formulário de criação de estabelecimento
- **Adicionada**: Visualização somente leitura dos dados do estabelecimento
- **Mensagem**: Explicação de que o estabelecimento foi criado automaticamente durante o registro

#### Seção "Configurações" Atualizada:
- **Nome**: Agora pode ser editado (antes era somente leitura)
- **Logo**: Pode ser editado
- **Slug**: Mantido como somente leitura
- **Tipo**: Mantido como somente leitura

### 4. Fluxo de Registro Atualizado

#### Antes:
1. Usuário escolhia plano
2. Preenchia formulário com slug e tipo manualmente
3. Estabelecimento era criado com dados informados

#### Agora:
1. Usuário escolhe plano
2. Preenche apenas nome do estabelecimento e logo (opcional)
3. Slug é gerado automaticamente baseado no nome
4. Tema é definido como "barber" por padrão
5. Estabelecimento é criado automaticamente

### 5. Validações e Restrições

#### No Banco de Dados:
- Constraint única garante que cada usuário só pode ter um estabelecimento
- Tentativas de criar múltiplos estabelecimentos resultarão em erro

#### Na Interface:
- Mensagens claras sobre a limitação
- Campos não editáveis marcados como desabilitados
- Redirecionamento para configurações para edições permitidas

## Como Aplicar as Mudanças

### 1. Aplicar a Constraint no Banco de Dados
Execute o SQL do arquivo `apply_constraint.sql` no SQL Editor do Supabase Dashboard:

```sql
ALTER TABLE public.tenants 
ADD CONSTRAINT tenants_owner_id_unique UNIQUE (owner_id);
```

### 2. Deploy das Mudanças
As mudanças no código já estão implementadas e prontas para deploy.

## Benefícios das Mudanças

1. **Simplicidade**: Processo de registro mais simples e direto
2. **Consistência**: Todos os estabelecimentos seguem o mesmo padrão inicial
3. **Segurança**: Prevenção de múltiplos estabelecimentos por usuário
4. **UX Melhorada**: Interface mais clara sobre o que pode e não pode ser editado
5. **Manutenibilidade**: Código mais limpo e focado

## Observações Importantes

- **Usuários Existentes**: A constraint será aplicada apenas a novos registros
- **Slugs Existentes**: Se houver conflito de slug, um número será adicionado automaticamente
- **Compatibilidade**: Todas as funcionalidades existentes continuam funcionando
- **Edição**: Usuários ainda podem editar nome e logo nas configurações
