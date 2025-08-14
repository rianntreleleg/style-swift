-- Adicionar documentação sobre timezone nas colunas de data/hora dos agendamentos
-- Esta migração adiciona comentários para deixar claro que as datas devem usar timezone local (Brasil)

-- Documentar que start_time e end_time devem usar timezone local
COMMENT ON COLUMN public.appointments.start_time IS 'Horário de início do agendamento em timezone local (Brasil/São Paulo). Não usar UTC.';
COMMENT ON COLUMN public.appointments.end_time IS 'Horário de fim do agendamento em timezone local (Brasil/São Paulo). Não usar UTC.';

-- Documentar business_hours também
COMMENT ON COLUMN public.business_hours.open_time IS 'Horário de abertura em timezone local (Brasil/São Paulo)';
COMMENT ON COLUMN public.business_hours.close_time IS 'Horário de fechamento em timezone local (Brasil/São Paulo)';

-- Adicionar índice simples para melhorar performance de consultas de agendamentos
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_start_time 
ON public.appointments(tenant_id, start_time);

-- Índice para consultas de horários disponíveis por profissional e status
CREATE INDEX IF NOT EXISTS idx_appointments_professional_time_status 
ON public.appointments(professional_id, start_time, end_time, status);
