-- Corrigir estrutura da tabela notification_logs
-- Data: 2025-01-16

-- Verificar se a tabela existe e adicionar colunas se necessário
DO $$
BEGIN
    -- Adicionar coluna 'type' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_logs' 
        AND column_name = 'type'
    ) THEN
        ALTER TABLE notification_logs ADD COLUMN type TEXT;
    END IF;

    -- Adicionar coluna 'tokens_sent' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_logs' 
        AND column_name = 'tokens_sent'
    ) THEN
        ALTER TABLE notification_logs ADD COLUMN tokens_sent INTEGER DEFAULT 0;
    END IF;

    -- Adicionar coluna 'fcm_message_id' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_logs' 
        AND column_name = 'fcm_message_id'
    ) THEN
        ALTER TABLE notification_logs ADD COLUMN fcm_message_id TEXT;
    END IF;

    -- Adicionar coluna 'sent_at' se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notification_logs' 
        AND column_name = 'sent_at'
    ) THEN
        ALTER TABLE notification_logs ADD COLUMN sent_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    RAISE NOTICE '✅ Estrutura da tabela notification_logs verificada e corrigida!';
END $$;

-- Criar índices se não existirem
CREATE INDEX IF NOT EXISTS idx_notification_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Função para limpar logs antigos (se não existir)
CREATE OR REPLACE FUNCTION cleanup_old_notification_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Deletar logs com mais de 90 dias
    DELETE FROM notification_logs 
    WHERE created_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'Notification logs: % logs antigos removidos', v_deleted_count;
    
    RETURN v_deleted_count;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION cleanup_old_notification_logs TO service_role;

DO $$
BEGIN
    RAISE NOTICE '✅ Estrutura de notification_logs finalizada!';
END $$;
