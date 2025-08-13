-- Corrigir constraint de status dos appointments
-- Execute este SQL no SQL Editor do Supabase Dashboard

-- Remover constraint existente
ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

-- Recriar a constraint com os valores corretos
ALTER TABLE public.appointments ADD CONSTRAINT appointments_status_check 
CHECK (status IN ('agendado', 'confirmado', 'concluido', 'cancelado', 'nao_compareceu'));

-- Atualizar valores existentes para o formato correto
UPDATE public.appointments 
SET status = 'agendado' 
WHERE status = 'scheduled';

UPDATE public.appointments 
SET status = 'confirmado' 
WHERE status = 'confirmed';

UPDATE public.appointments 
SET status = 'concluido' 
WHERE status = 'completed';

UPDATE public.appointments 
SET status = 'cancelado' 
WHERE status = 'cancelled';

UPDATE public.appointments 
SET status = 'nao_compareceu' 
WHERE status = 'no_show';

-- Verificar se a correção funcionou
SELECT DISTINCT status FROM public.appointments;
