-- Criação da tabela time_blocks para bloqueio de horários
-- Data: 2025-01-15

-- Criar tabela time_blocks
CREATE TABLE IF NOT EXISTS public.time_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_time_block_valid CHECK (end_time > start_time)
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_time_blocks_tenant_id ON public.time_blocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_professional_id ON public.time_blocks(professional_id);
CREATE INDEX IF NOT EXISTS idx_time_blocks_time_range ON public.time_blocks(start_time, end_time);

-- Habilitar RLS
ALTER TABLE public.time_blocks ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Owners can manage time blocks" ON public.time_blocks
FOR ALL
USING (EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = time_blocks.tenant_id 
    AND t.owner_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = time_blocks.tenant_id 
    AND t.owner_id = auth.uid()
));

-- Trigger para atualizar updated_at
CREATE TRIGGER trg_time_blocks_updated 
BEFORE UPDATE ON public.time_blocks 
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários
COMMENT ON TABLE public.time_blocks IS 'Tabela para armazenar bloqueios de horários dos profissionais';
COMMENT ON COLUMN public.time_blocks.tenant_id IS 'ID do tenant (estabelecimento)';
COMMENT ON COLUMN public.time_blocks.professional_id IS 'ID do profissional (opcional, se NULL bloqueia para todos)';
COMMENT ON COLUMN public.time_blocks.start_time IS 'Data/hora de início do bloqueio';
COMMENT ON COLUMN public.time_blocks.end_time IS 'Data/hora de fim do bloqueio';
COMMENT ON COLUMN public.time_blocks.reason IS 'Motivo do bloqueio (opcional)';
