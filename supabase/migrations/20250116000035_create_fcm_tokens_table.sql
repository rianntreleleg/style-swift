-- Criar tabela para tokens FCM (Firebase Cloud Messaging)
-- Data: 2025-01-16

-- Tabela para armazenar tokens FCM dos usuários
CREATE TABLE IF NOT EXISTS fcm_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    device_info JSONB DEFAULT '{}',
    last_used TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_user_id ON fcm_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_tenant_id ON fcm_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_token ON fcm_tokens(token);
CREATE INDEX IF NOT EXISTS idx_fcm_tokens_active ON fcm_tokens(is_active) WHERE is_active = true;

-- RLS para fcm_tokens
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Política para usuários verem seus próprios tokens
DROP POLICY IF EXISTS "Users can view their own FCM tokens" ON fcm_tokens;
CREATE POLICY "Users can view their own FCM tokens" ON fcm_tokens
    FOR SELECT USING (auth.uid() = user_id);

-- Política para usuários inserirem seus próprios tokens
DROP POLICY IF EXISTS "Users can insert their own FCM tokens" ON fcm_tokens;
CREATE POLICY "Users can insert their own FCM tokens" ON fcm_tokens
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Política para usuários atualizarem seus próprios tokens
DROP POLICY IF EXISTS "Users can update their own FCM tokens" ON fcm_tokens;
CREATE POLICY "Users can update their own FCM tokens" ON fcm_tokens
    FOR UPDATE USING (auth.uid() = user_id);

-- Política para usuários deletarem seus próprios tokens
DROP POLICY IF EXISTS "Users can delete their own FCM tokens" ON fcm_tokens;
CREATE POLICY "Users can delete their own FCM tokens" ON fcm_tokens
    FOR DELETE USING (auth.uid() = user_id);

-- Política para o sistema gerenciar tokens (para envio de notificações)
DROP POLICY IF EXISTS "System can manage FCM tokens" ON fcm_tokens;
CREATE POLICY "System can manage FCM tokens" ON fcm_tokens
    FOR ALL USING (true);

-- Função para limpar tokens antigos/inativos
CREATE OR REPLACE FUNCTION cleanup_old_fcm_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    -- Deletar tokens inativos há mais de 30 dias
    DELETE FROM fcm_tokens 
    WHERE is_active = false 
    AND updated_at < NOW() - INTERVAL '30 days';
    
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
    
    RAISE NOTICE 'FCM: % tokens antigos removidos', v_deleted_count;
    
    RETURN v_deleted_count;
END;
$$;

-- Função para obter tokens ativos de um tenant
CREATE OR REPLACE FUNCTION get_active_fcm_tokens(p_tenant_id UUID)
RETURNS TABLE(
    user_id UUID,
    token TEXT,
    device_info JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ft.user_id,
        ft.token,
        ft.device_info
    FROM fcm_tokens ft
    WHERE ft.tenant_id = p_tenant_id
    AND ft.is_active = true
    AND ft.last_used > NOW() - INTERVAL '7 days';
END;
$$;

-- Função para marcar token como inativo
CREATE OR REPLACE FUNCTION deactivate_fcm_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE fcm_tokens 
    SET is_active = false, updated_at = NOW()
    WHERE token = p_token;
    
    RETURN FOUND;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION cleanup_old_fcm_tokens TO service_role;
GRANT EXECUTE ON FUNCTION get_active_fcm_tokens TO service_role;
GRANT EXECUTE ON FUNCTION deactivate_fcm_token TO service_role;

-- Criar job para limpeza automática (executar diariamente)
-- Isso pode ser configurado no Supabase Dashboard > Database > Functions

DO $$
BEGIN
    RAISE NOTICE '✅ Tabela FCM tokens criada com sucesso!';
END $$;
