-- Adicionar colunas customer_phone e customer_email na tabela appointments
-- Esta migração garante que os dados de contato dos clientes sejam salvos corretamente

-- Adicionar coluna customer_phone se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'customer_phone') THEN
    ALTER TABLE public.appointments ADD COLUMN customer_phone VARCHAR(20);
  END IF;
END $$;

-- Adicionar coluna customer_email se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'appointments' AND column_name = 'customer_email') THEN
    ALTER TABLE public.appointments ADD COLUMN customer_email VARCHAR(255);
  END IF;
END $$;

-- Adicionar comentários nas colunas
COMMENT ON COLUMN public.appointments.customer_phone IS 'Número de telefone do cliente para contato via WhatsApp';
COMMENT ON COLUMN public.appointments.customer_email IS 'Email do cliente para contato';

-- Criar índices para melhorar performance de consultas
CREATE INDEX IF NOT EXISTS idx_appointments_customer_phone ON public.appointments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_customer_email ON public.appointments(customer_email);

-- Atualizar registros existentes que não têm customer_phone
-- Copiar dados de customer_contact para customer_phone se customer_phone estiver vazio
UPDATE public.appointments 
SET customer_phone = customer_contact 
WHERE customer_phone IS NULL AND customer_contact IS NOT NULL;

-- Log das alterações
DO $$
BEGIN
  RAISE NOTICE 'Migração concluída: Colunas customer_phone e customer_email adicionadas à tabela appointments';
END $$;
