-- Inicializar gamification_stats para tenants existentes
-- Criado em: 2025-01-16

-- Função para inicializar gamification_stats para um tenant
CREATE OR REPLACE FUNCTION initialize_gamification_stats(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Inserir registro de gamification_stats se não existir
    INSERT INTO gamification_stats (
        tenant_id,
        total_achievements_earned,
        total_points_distributed,
        total_badges_earned,
        average_user_level,
        total_challenges_completed
    )
    VALUES (
        p_tenant_id,
        0,
        0,
        0,
        1.0,
        0
    )
    ON CONFLICT (tenant_id) DO NOTHING;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION initialize_gamification_stats(UUID) TO authenticated;

-- Inicializar gamification_stats para todos os tenants existentes
DO $$
DECLARE
    tenant_record RECORD;
BEGIN
    FOR tenant_record IN SELECT id FROM tenants LOOP
        PERFORM initialize_gamification_stats(tenant_record.id);
    END LOOP;
END $$;

-- Trigger para criar gamification_stats automaticamente para novos tenants
CREATE OR REPLACE FUNCTION create_gamification_stats_for_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM initialize_gamification_stats(NEW.id);
    RETURN NEW;
END;
$$;

-- Criar trigger se não existir
DROP TRIGGER IF EXISTS trigger_create_gamification_stats ON tenants;
CREATE TRIGGER trigger_create_gamification_stats
    AFTER INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION create_gamification_stats_for_tenant();

COMMENT ON FUNCTION initialize_gamification_stats(UUID) IS 'Inicializa gamification_stats para um tenant';
COMMENT ON FUNCTION create_gamification_stats_for_tenant() IS 'Cria gamification_stats automaticamente para novos tenants';
