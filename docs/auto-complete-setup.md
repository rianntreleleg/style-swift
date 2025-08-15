# Sistema de Conclusão Automática de Agendamentos

## 📋 Visão Geral

O sistema automaticamente marca agendamentos confirmados como "concluído" após 24 horas do horário agendado. Isso ajuda a manter o histórico organizado e evita que agendamentos antigos fiquem pendentes.

## 🔧 Como Funciona

### 1. **Trigger Automático**
- Quando um agendamento é marcado como "confirmado", um trigger é ativado
- O sistema agenda uma verificação para 24 horas após o horário do agendamento

### 2. **Processamento Automático**
- A função `auto_complete_appointments()` busca agendamentos confirmados que passaram de 24 horas
- Marca automaticamente como "concluído"
- Registra logs para auditoria

### 3. **Execução via Cron**
- A Edge Function `auto-complete-appointments` é executada periodicamente
- Processa todos os agendamentos pendentes de conclusão

## 🚀 Configuração

### Opção 1: Cron Job Automático (Recomendado)

Configure um cron job para executar a função a cada hora:

```bash
# Executar a cada hora
0 * * * * curl -X POST "https://jsubmkwvqzddgppvgxiu.supabase.co/functions/v1/auto-complete-appointments" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

### Opção 2: Cron Job com Autenticação

```bash
# Executar a cada hora com header de autenticação
0 * * * * curl -X POST "https://jsubmkwvqzddgppvgxiu.supabase.co/functions/v1/auto-complete-appointments" \
  -H "x-cron-secret: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json"
```

### Opção 3: Execução Manual

No painel admin, use o botão "Conclusão Automática" na aba de agendamentos.

## 📊 Funções Disponíveis

### 1. `auto_complete_appointments()`
- **Função**: Marca agendamentos confirmados como concluídos após 24 horas
- **Execução**: Automática via cron ou manual
- **Retorno**: Void (apenas logs)

### 2. `check_and_complete_appointment(appointment_id)`
- **Função**: Verifica e conclui um agendamento específico
- **Parâmetros**: UUID do agendamento
- **Retorno**: Boolean (true se foi concluído)

### 3. `process_pending_completions()`
- **Função**: Função principal para processamento em lote
- **Execução**: Chamada pela Edge Function
- **Retorno**: JSON com estatísticas

## 🔍 Monitoramento

### Logs Automáticos
O sistema registra automaticamente:
- Agendamentos concluídos
- Total processado
- Erros (se houver)

### Verificação Manual
```sql
-- Verificar agendamentos confirmados antigos
SELECT 
  id, 
  customer_name, 
  start_time, 
  status,
  updated_at
FROM appointments 
WHERE 
  status = 'confirmado' 
  AND start_time < NOW() - INTERVAL '24 hours'
ORDER BY start_time DESC;

-- Verificar agendamentos concluídos recentemente
SELECT 
  id, 
  customer_name, 
  start_time, 
  updated_at
FROM appointments 
WHERE 
  status = 'concluido' 
  AND updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC;
```

## ⚙️ Configuração de Variáveis de Ambiente

### Para Edge Function
```bash
CRON_SECRET=your_secret_key_here
SUPABASE_URL=https://jsubmkwvqzddgppvgxiu.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🛠️ Troubleshooting

### Problema: Agendamentos não estão sendo concluídos
1. Verifique se o cron job está executando
2. Confirme se os agendamentos estão com status "confirmado"
3. Verifique os logs da Edge Function

### Problema: Erro de autenticação
1. Verifique se a `SUPABASE_SERVICE_ROLE_KEY` está correta
2. Confirme se o `CRON_SECRET` está configurado

### Problema: Performance lenta
1. O índice `idx_appointments_auto_completion` foi criado automaticamente
2. Verifique se há muitos agendamentos antigos

## 📈 Estatísticas

O sistema retorna estatísticas após cada execução:
```json
{
  "success": true,
  "completed_count": 5,
  "timestamp": "2025-01-16T10:30:00Z",
  "message": "Processamento de conclusões automáticas concluído"
}
```

## 🔒 Segurança

- Todas as funções usam `SECURITY DEFINER`
- Apenas o `service_role` pode executar as funções
- Logs detalhados para auditoria
- Validação de autenticação na Edge Function

## 📝 Notas Importantes

1. **Agendamentos muito antigos**: O sistema evita processar agendamentos com mais de 48 horas
2. **Performance**: O índice otimizado garante execução rápida
3. **Idempotência**: Executar múltiplas vezes não causa problemas
4. **Logs**: Todos os logs são registrados para auditoria

## 🎯 Exemplo de Uso

```javascript
// No frontend (React)
import { useAutoComplete } from '@/hooks/useAutoComplete';

const { processCompletions } = useAutoComplete();

// Executar manualmente
processCompletions.mutate();

// Verificar um agendamento específico
const { checkAndCompleteAppointment } = useAutoComplete();
checkAndCompleteAppointment.mutate('appointment-id-here');
```

---

**Sistema implementado e funcionando!** 🎉
