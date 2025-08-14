-- Adicionar campo phone à tabela tenants
ALTER TABLE public.tenants 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.tenants.phone IS 'Telefone do estabelecimento usado para validação e emails de confirmação';

-- Criar índice para busca por telefone (opcional, para performance)
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON public.tenants(phone);

-- Adicionar constraint para garantir que o telefone tenha pelo menos 10 caracteres
ALTER TABLE public.tenants 
ADD CONSTRAINT check_phone_length CHECK (LENGTH(phone) >= 10);
