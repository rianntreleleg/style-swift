# 🔔 Sistema de Push Notifications - StyleSwift

## 📋 Visão Geral

O sistema de push notifications do StyleSwift foi implementado usando **Firebase Cloud Messaging (FCM)** para garantir que as notificações cheguem ao celular do administrador mesmo com o app fechado ou dispositivo desligado.

## ✨ Características Principais

### 🚀 **Funcionalidades Implementadas**

- ✅ **Push Notifications Reais**: Usando Firebase Cloud Messaging
- ✅ **Funciona com App Fechado**: Notificações chegam mesmo com o app em background
- ✅ **Persistência**: Notificações entregues mesmo após reinicialização do dispositivo
- ✅ **Entrega Confiável**: Infraestrutura robusta do Firebase
- ✅ **Compatibilidade**: Android, iOS e Web
- ✅ **Tempo Real**: Entrega imediata de notificações
- ✅ **Configurações Personalizáveis**: Por usuário e tipo de notificação
- ✅ **Horário Silencioso**: Configuração de horários para não perturbar
- ✅ **Logs Completos**: Rastreamento de todas as notificações enviadas

### 📱 **Tipos de Notificação Suportados**

1. **Novos Agendamentos** - Quando um cliente agenda um serviço
2. **Lembretes de Agendamento** - Alertas antes dos horários marcados
3. **Pagamentos Recebidos** - Confirmação de pagamentos
4. **Alertas do Sistema** - Notificações importantes do sistema
5. **Cancelamentos** - Quando agendamentos são cancelados
6. **Mudanças de Status** - Alterações no status de agendamentos
7. **Backup Automático** - Status de backups do sistema
8. **Estoque Baixo** - Alertas de produtos com estoque baixo

## 🏗️ Arquitetura do Sistema

### **Componentes Principais**

```
📁 src/
├── 📁 hooks/
│   └── usePushNotifications.ts          # Hook principal para gerenciar FCM
├── 📁 components/
│   └── PushNotificationManager.tsx      # Interface de usuário
├── 📁 lib/
│   └── notificationService.ts           # Serviço para envio automático
└── 📁 integrations/
    └── supabase/
        └── client.ts                    # Cliente Supabase

📁 public/
└── firebase-messaging-sw.js             # Service Worker para FCM

📁 supabase/
├── 📁 functions/
│   ├── send-push-notification/          # Edge Function individual
│   └── send-bulk-notifications/         # Edge Function em massa
└── 📁 migrations/
    └── 20250116000025_create_push_notifications_tables.sql
```

## 🚀 Configuração

### **1. Configurar Firebase**

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Ative o Cloud Messaging
3. Gere as chaves necessárias:
   - API Key
   - Project ID
   - Messaging Sender ID
   - VAPID Key (para web)

### **2. Configurar Variáveis de Ambiente**

Crie um arquivo `.env.local` com as seguintes variáveis:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### **3. Configurar Supabase Edge Functions**

1. Configure as variáveis de ambiente nas Edge Functions:
   ```bash
   supabase secrets set FIREBASE_SERVER_KEY=your_firebase_server_key
   ```

2. Deploy das Edge Functions:
   ```bash
   supabase functions deploy send-push-notification
   supabase functions deploy send-bulk-notifications
   ```

### **4. Executar Migração do Banco**

```bash
supabase db push
```

## 📱 Como Usar

### **1. No Frontend (React)**

```tsx
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { notificationService } from '@/lib/notificationService';

// Em um componente
const { requestPermission, isSubscribed } = usePushNotifications(tenantId);

// Solicitar permissão
await requestPermission();

// Enviar notificação automática
await notificationService.notifyNewAppointment(tenantId, {
  id: 'appointment-id',
  customer_name: 'João Silva',
  service_name: 'Corte de Cabelo',
  appointment_date: '2025-01-16 14:00'
});
```

### **2. Componente de Gerenciamento**

```tsx
import PushNotificationManager from '@/components/PushNotificationManager';

<PushNotificationManager tenantId={tenantId} />
```

### **3. Envio Automático**

O sistema envia notificações automaticamente para:

- **Novos agendamentos**: Quando um cliente agenda
- **Lembretes**: 24h antes do agendamento
- **Pagamentos**: Quando um pagamento é confirmado
- **Alertas**: Para eventos importantes do sistema

## 🔧 API das Edge Functions

### **send-push-notification**

Envia notificação para um token específico.

```typescript
POST /functions/v1/send-push-notification
{
  "token": "fcm_token_here",
  "notification": {
    "title": "Título da Notificação",
    "body": "Corpo da mensagem",
    "icon": "/icons/icon-192x192.png"
  },
  "data": {
    "type": "new_appointment",
    "appointment_id": "123"
  }
}
```

### **send-bulk-notifications**

Envia notificação em massa para um tenant.

```typescript
POST /functions/v1/send-bulk-notifications
{
  "tenant_id": "tenant-uuid",
  "notification": {
    "title": "Título da Notificação",
    "body": "Corpo da mensagem"
  },
  "data": {
    "type": "new_appointment"
  },
  "user_ids": ["user1", "user2"] // opcional
}
```

## 📊 Estrutura do Banco de Dados

### **Tabelas Criadas**

1. **`fcm_tokens`** - Armazena tokens FCM dos usuários
2. **`notification_logs`** - Logs de todas as notificações enviadas
3. **`notification_settings`** - Configurações por usuário
4. **`notification_templates`** - Templates personalizáveis
5. **`scheduled_notifications`** - Notificações agendadas

### **Políticas de Segurança (RLS)**

- Usuários só podem ver/editar seus próprios tokens
- Configurações são privadas por usuário
- Logs são visíveis apenas para o usuário proprietário

## 🧪 Testes

### **Teste Manual**

1. Abra o componente `PushNotificationManager`
2. Clique em "Ativar Notificações"
3. Conceda permissão quando solicitado
4. Clique em "Testar Notificação"
5. Verifique se a notificação chega no dispositivo

### **Teste Automático**

```typescript
// Teste de notificação de novo agendamento
await notificationService.notifyNewAppointment(tenantId, {
  id: 'test-appointment',
  customer_name: 'Cliente Teste',
  service_name: 'Serviço Teste',
  appointment_date: '2025-01-16 15:00'
});
```

## 🔍 Monitoramento e Logs

### **Logs Disponíveis**

- **Console do Navegador**: Logs detalhados do FCM
- **Supabase Logs**: Logs das Edge Functions
- **Tabela `notification_logs`**: Histórico completo de envios
- **Firebase Console**: Métricas de entrega

### **Métricas Importantes**

- Taxa de entrega
- Tokens inválidos
- Falhas de envio
- Performance por tipo de notificação

## 🛠️ Troubleshooting

### **Problemas Comuns**

1. **Notificação não chega**
   - Verificar se o token FCM está válido
   - Confirmar permissões do navegador
   - Verificar configurações do Firebase

2. **Erro de permissão**
   - Verificar se o usuário concedeu permissão
   - Limpar cache do navegador
   - Verificar se o site é HTTPS

3. **Token inválido**
   - O sistema remove automaticamente tokens inválidos
   - Usuário precisa reativar notificações

### **Debug**

```typescript
// Verificar status das notificações
console.log('FCM Status:', {
  isSupported,
  isEnabled,
  isSubscribed,
  fcmToken
});

// Verificar logs no banco
const { data: logs } = await supabase
  .from('notification_logs')
  .select('*')
  .order('sent_at', { ascending: false })
  .limit(10);
```

## 🔒 Segurança

### **Medidas Implementadas**

- ✅ Tokens FCM são armazenados de forma segura
- ✅ Políticas RLS protegem dados dos usuários
- ✅ Autenticação obrigatória para envio
- ✅ Validação de entrada em todas as APIs
- ✅ Logs de auditoria completos

### **Boas Práticas**

- Nunca exponha chaves do Firebase no frontend
- Use variáveis de ambiente para configurações sensíveis
- Monitore logs regularmente
- Limpe tokens antigos automaticamente

## 📈 Performance

### **Otimizações Implementadas**

- Envio em lotes para múltiplos usuários
- Cache de configurações de usuário
- Limpeza automática de tokens antigos
- Índices otimizados no banco de dados
- Service Worker eficiente

### **Limites**

- FCM: 1000 tokens por requisição
- Rate limiting: 1000 notificações/minuto
- TTL padrão: 28 dias
- Tamanho máximo: 4KB por notificação

## 🚀 Próximos Passos

### **Melhorias Futuras**

- [ ] Notificações agendadas
- [ ] Templates personalizáveis por tenant
- [ ] Analytics avançados
- [ ] Integração com WhatsApp Business
- [ ] Notificações para clientes
- [ ] Suporte a múltiplos idiomas

### **Integração com Outros Sistemas**

- [ ] Webhook para sistemas externos
- [ ] API REST para terceiros
- [ ] Integração com CRM
- [ ] Sincronização com calendários

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique os logs no console do navegador
2. Consulte a documentação do Firebase
3. Verifique as configurações no Supabase
4. Teste com o componente `PushNotificationManager`

---

**🎯 Meta Alcançada**: O sistema de push notifications funciona como apps nativos de alta qualidade (WhatsApp, Gmail, etc.), entregando mensagens mesmo com o app fechado ou celular desligado.
