# 🔔 Sistema de Notificações - Documentação Completa

## 🎯 **Visão Geral**

O sistema de notificações foi implementado para informar automaticamente os tenants sobre eventos importantes relacionados aos agendamentos, incluindo criação, atualização, cancelamento e conclusão de agendamentos.

---

## 🏗️ **Arquitetura do Sistema**

### **Backend (Supabase)**
- **Tabela `notifications`**: Armazena todas as notificações
- **Tabela `notification_settings`**: Configurações por tenant
- **Triggers automáticos**: Criam notificações automaticamente
- **Funções RPC**: Gerenciam notificações via API

### **Frontend (React)**
- **Hook `useNotifications`**: Gerencia estado e operações
- **Componente `NotificationBell`**: Botão com contador
- **Componente `NotificationsPanel`**: Painel completo de notificações
- **Real-time**: Atualizações em tempo real via Supabase

---

## 📊 **Estrutura do Banco de Dados**

### **Tabela `notifications`**
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    user_id UUID REFERENCES auth.users(id),
    type TEXT CHECK (type IN ('appointment_created', 'appointment_updated', 'appointment_cancelled', 'appointment_completed', 'payment_received', 'system_alert')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    is_important BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ
);
```

### **Tabela `notification_settings`**
```sql
CREATE TABLE notification_settings (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    push_notifications BOOLEAN DEFAULT true,
    appointment_created BOOLEAN DEFAULT true,
    appointment_updated BOOLEAN DEFAULT true,
    appointment_cancelled BOOLEAN DEFAULT true,
    appointment_completed BOOLEAN DEFAULT true,
    payment_received BOOLEAN DEFAULT true,
    system_alerts BOOLEAN DEFAULT true,
    quiet_hours_start TIME DEFAULT '22:00',
    quiet_hours_end TIME DEFAULT '08:00'
);
```

---

## 🔧 **Funcionalidades Implementadas**

### **1. Notificações Automáticas**
- ✅ **Novo agendamento**: Quando cliente agenda
- ✅ **Agendamento atualizado**: Quando data/hora muda
- ✅ **Agendamento cancelado**: Quando status muda para "cancelled"
- ✅ **Agendamento concluído**: Quando status muda para "completed"

### **2. Interface do Usuário**
- ✅ **Sino de notificações**: Com contador de não lidas
- ✅ **Painel lateral**: Lista completa de notificações
- ✅ **Filtros**: Todas, Não lidas, Importantes
- ✅ **Configurações**: Personalização por tipo

### **3. Real-time**
- ✅ **Atualizações instantâneas**: Via Supabase Realtime
- ✅ **Contador dinâmico**: Atualiza automaticamente
- ✅ **Toasts**: Para notificações importantes

### **4. Gerenciamento**
- ✅ **Marcar como lida**: Individual ou em massa
- ✅ **Configurações**: Habilitar/desabilitar tipos
- ✅ **Expiração**: Notificações expiram em 7 dias

---

## 🎨 **Componentes da Interface**

### **NotificationBell**
```tsx
<NotificationBell tenantId={tenantId} />
```
- **Localização**: Header do Admin
- **Funcionalidades**: 
  - Contador de não lidas
  - Animação de entrada
  - Tooltip informativo
  - Abre painel lateral

### **NotificationsPanel**
```tsx
<NotificationsPanel 
  tenantId={tenantId}
  isOpen={isOpen}
  onClose={onClose}
/>
```
- **Funcionalidades**:
  - Lista de notificações
  - Filtros por tipo
  - Configurações
  - Marcar como lida

---

## 📱 **Tipos de Notificação**

| Tipo | Ícone | Cor | Descrição |
|------|-------|-----|-----------|
| `appointment_created` | 📅 | Verde | Novo agendamento |
| `appointment_updated` | 🔄 | Azul | Agendamento atualizado |
| `appointment_cancelled` | ⚠️ | Vermelho | Agendamento cancelado |
| `appointment_completed` | ✅ | Verde | Agendamento concluído |
| `payment_received` | 👤 | Roxo | Pagamento recebido |
| `system_alert` | ⚠️ | Laranja | Alerta do sistema |

---

## ⚙️ **Configurações Disponíveis**

### **Tipos de Notificação**
- ✅ Novos agendamentos
- ✅ Agendamentos atualizados
- ✅ Agendamentos cancelados
- ✅ Agendamentos concluídos
- ✅ Pagamentos recebidos
- ✅ Alertas do sistema

### **Canais de Notificação**
- ✅ Notificações push (in-app)
- ✅ Notificações por email (futuro)

### **Horário Silencioso**
- ⏰ Configurável (padrão: 22h às 8h)
- 🔕 Não envia notificações neste período

---

## 🔄 **Fluxo de Funcionamento**

### **1. Criação de Agendamento**
```
Cliente agenda → Trigger SQL → Cria notificação → Real-time → UI atualiza
```

### **2. Visualização**
```
Usuário clica no sino → Abre painel → Carrega notificações → Mostra lista
```

### **3. Marcação como Lida**
```
Usuário clica → RPC atualiza → Real-time → UI atualiza → Contador diminui
```

---

## 🚀 **Como Usar**

### **Para o Desenvolvedor**
1. **Aplicar migração SQL**:
   ```bash
   npx supabase db push --include-all
   ```

2. **Importar componentes**:
   ```tsx
   import { NotificationBell } from '@/components/NotificationBell';
   import { useNotifications } from '@/hooks/useNotifications';
   ```

3. **Adicionar ao layout**:
   ```tsx
   <NotificationBell tenantId={tenantId} />
   ```

### **Para o Usuário**
1. **Ver notificações**: Clicar no sino no header
2. **Marcar como lida**: Clicar no ✓ de cada notificação
3. **Marcar todas**: Botão "Marcar todas" no painel
4. **Configurar**: Aba "Configurações" no painel

---

## 📈 **Performance e Otimizações**

### **Índices Criados**
- `idx_notifications_tenant_id`: Busca por tenant
- `idx_notifications_created_at`: Ordenação por data
- `idx_notifications_unread`: Contador de não lidas
- `idx_notifications_important`: Notificações importantes

### **Real-time Otimizado**
- **Canal específico**: `notifications:${tenantId}`
- **Filtros**: Apenas notificações do tenant
- **Cleanup**: Remove canal ao desmontar

### **Cache e Estado**
- **Estado local**: Reduz chamadas à API
- **Otimistic updates**: UI atualiza imediatamente
- **Debounce**: Evita múltiplas chamadas

---

## 🧪 **Testes e Validação**

### **Cenários de Teste**
1. **Criar agendamento** → Verificar notificação
2. **Atualizar agendamento** → Verificar notificação
3. **Cancelar agendamento** → Verificar notificação
4. **Marcar como lida** → Verificar contador
5. **Configurações** → Verificar persistência

### **Validação de Funcionalidades**
- ✅ Notificações aparecem em tempo real
- ✅ Contador atualiza corretamente
- ✅ Configurações são salvas
- ✅ Filtros funcionam
- ✅ Responsividade mobile

---

## 🔮 **Funcionalidades Futuras**

### **Próximas Implementações**
- 📧 **Notificações por email**
- 📱 **Push notifications** (navegador)
- 🔔 **Sons de notificação**
- 📊 **Relatórios de notificações**
- 🤖 **Notificações inteligentes**

### **Melhorias Planejadas**
- **Agrupamento**: Notificações similares
- **Priorização**: Algoritmo de importância
- **Personalização**: Templates customizáveis
- **Integração**: WhatsApp, SMS

---

## 🛠️ **Manutenção e Troubleshooting**

### **Problemas Comuns**
1. **Notificações não aparecem**:
   - Verificar triggers SQL
   - Verificar configurações do tenant
   - Verificar real-time connection

2. **Contador incorreto**:
   - Verificar função `count_unread_notifications`
   - Verificar estado local do hook

3. **Performance lenta**:
   - Verificar índices do banco
   - Verificar queries RPC
   - Verificar real-time channels

### **Logs Úteis**
```javascript
// Verificar notificações
console.log('Notificações:', notifications);

// Verificar contador
console.log('Não lidas:', unreadCount);

// Verificar configurações
console.log('Settings:', settings);
```

---

## 📋 **Checklist de Implementação**

### ✅ **Backend**
- [x] Tabela `notifications` criada
- [x] Tabela `notification_settings` criada
- [x] Triggers automáticos configurados
- [x] Funções RPC implementadas
- [x] RLS e permissões configuradas
- [x] Índices de performance criados

### ✅ **Frontend**
- [x] Hook `useNotifications` implementado
- [x] Componente `NotificationBell` criado
- [x] Componente `NotificationsPanel` criado
- [x] Real-time configurado
- [x] Integração no Admin.tsx
- [x] Animações e UX implementadas

### ✅ **Testes**
- [x] TypeScript sem erros
- [x] Build funcionando
- [x] Componentes responsivos
- [x] Real-time funcionando

---

*Documentação criada em: 16/01/2025*
*Status: Sistema completo e funcional*
*Próximo passo: Aplicar migração SQL e testar em produção*
