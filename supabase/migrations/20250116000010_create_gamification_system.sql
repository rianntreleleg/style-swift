-- Sistema de Gamificação para SaaS de Agendamentos
-- Criado em: 2025-01-16

-- 1. TABELA DE CONQUISTAS
CREATE TABLE IF NOT EXISTS achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('appointments', 'customers', 'revenue', 'loyalty', 'referrals', 'quality')),
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('count', 'streak', 'amount', 'percentage', 'custom')),
    requirement_value INTEGER NOT NULL,
    requirement_period TEXT CHECK (requirement_period IN ('once', 'daily', 'weekly', 'monthly', 'yearly')),
    points_reward INTEGER DEFAULT 0,
    badge_reward TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA DE CONQUISTAS CONQUISTADAS
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    achievement_id UUID REFERENCES achievements(id) ON DELETE CASCADE,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, achievement_id)
);

-- 3. TABELA DE PONTOS E NÍVEIS
CREATE TABLE IF NOT EXISTS user_points (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    total_points INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    experience_to_next_level INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);

-- 4. TABELA DE HISTÓRICO DE PONTOS
CREATE TABLE IF NOT EXISTS points_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    points_earned INTEGER NOT NULL,
    points_spent INTEGER DEFAULT 0,
    reason TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('achievement', 'appointment', 'referral', 'streak', 'bonus')),
    source_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA DE RANKING DE PROFISSIONAIS
CREATE TABLE IF NOT EXISTS professional_rankings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    total_appointments INTEGER DEFAULT 0,
    completed_appointments INTEGER DEFAULT 0,
    cancelled_appointments INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    total_ratings INTEGER DEFAULT 0,
    total_revenue_cents BIGINT DEFAULT 0,
    customer_satisfaction_score INTEGER DEFAULT 0,
    specialization_badges TEXT[],
    performance_score INTEGER DEFAULT 0,
    ranking_position INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, professional_id)
);

-- 6. TABELA DE AVALIAÇÕES DE CLIENTES
CREATE TABLE IF NOT EXISTS customer_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    professional_id UUID REFERENCES professionals(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    review_photos TEXT[],
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. TABELA DE DESAFIOS MENSAIS
CREATE TABLE IF NOT EXISTS monthly_challenges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    challenge_type TEXT NOT NULL CHECK (challenge_type IN ('appointments', 'revenue', 'satisfaction', 'referrals', 'quality')),
    target_value INTEGER NOT NULL,
    reward_points INTEGER DEFAULT 0,
    reward_badge TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA DE PROGRESSO DOS DESAFIOS
CREATE TABLE IF NOT EXISTS challenge_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    challenge_id UUID REFERENCES monthly_challenges(id) ON DELETE CASCADE,
    current_progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, challenge_id)
);

-- 9. TABELA DE STREAKS (SEQUÊNCIAS)
CREATE TABLE IF NOT EXISTS user_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    streak_type TEXT NOT NULL CHECK (streak_type IN ('appointments', 'days_active', 'revenue', 'satisfaction')),
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, streak_type)
);

-- 10. TABELA DE BADGES E ESPECIALIZAÇÕES
CREATE TABLE IF NOT EXISTS badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('specialization', 'achievement', 'milestone', 'quality')),
    rarity TEXT NOT NULL CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    requirements JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. TABELA DE BADGES CONQUISTADOS
CREATE TABLE IF NOT EXISTS user_badges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id, badge_id)
);

-- 12. TABELA DE ESTATÍSTICAS DE GAMIFICAÇÃO
CREATE TABLE IF NOT EXISTS gamification_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
    total_achievements_earned INTEGER DEFAULT 0,
    total_points_distributed INTEGER DEFAULT 0,
    total_badges_earned INTEGER DEFAULT 0,
    average_user_level DECIMAL(3,1) DEFAULT 1.0,
    most_popular_achievement UUID REFERENCES achievements(id),
    highest_level_user UUID REFERENCES auth.users(id),
    total_challenges_completed INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ÍNDICES PARA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_achievements_tenant_category ON achievements(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_user_achievements_tenant_user ON user_achievements(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_points_tenant_user ON user_points(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_points_history_tenant_user ON points_history(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_professional_rankings_tenant ON professional_rankings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_reviews_tenant ON customer_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_monthly_challenges_tenant ON monthly_challenges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_challenge_progress_tenant_user ON challenge_progress(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_user_streaks_tenant_user ON user_streaks(tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_badges_tenant_category ON badges(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_user_badges_tenant_user ON user_badges(tenant_id, user_id);

-- RLS (Row Level Security)
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE gamification_stats ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS
-- Políticas para achievements
CREATE POLICY "Tenant users can view achievements" ON achievements
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Tenant owners can manage achievements" ON achievements
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Políticas para user_achievements
CREATE POLICY "Users can view their own achievements" ON user_achievements
    FOR SELECT USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage user achievements" ON user_achievements
    FOR ALL USING (true);

-- Políticas para user_points
CREATE POLICY "Users can view their own points" ON user_points
    FOR SELECT USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage user points" ON user_points
    FOR ALL USING (true);

-- Políticas para points_history
CREATE POLICY "Users can view their own points history" ON points_history
    FOR SELECT USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage points history" ON points_history
    FOR ALL USING (true);

-- Políticas para professional_rankings
CREATE POLICY "Tenant users can view professional rankings" ON professional_rankings
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage professional rankings" ON professional_rankings
    FOR ALL USING (true);

-- Políticas para customer_reviews
CREATE POLICY "Tenant users can view customer reviews" ON customer_reviews
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage customer reviews" ON customer_reviews
    FOR ALL USING (true);

-- Políticas para monthly_challenges
CREATE POLICY "Tenant users can view monthly challenges" ON monthly_challenges
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Tenant owners can manage monthly challenges" ON monthly_challenges
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Políticas para challenge_progress
CREATE POLICY "Users can view their own challenge progress" ON challenge_progress
    FOR SELECT USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage challenge progress" ON challenge_progress
    FOR ALL USING (true);

-- Políticas para user_streaks
CREATE POLICY "Users can view their own streaks" ON user_streaks
    FOR SELECT USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage user streaks" ON user_streaks
    FOR ALL USING (true);

-- Políticas para badges
CREATE POLICY "Tenant users can view badges" ON badges
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "Tenant owners can manage badges" ON badges
    FOR ALL USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

-- Políticas para user_badges
CREATE POLICY "Users can view their own badges" ON user_badges
    FOR SELECT USING (
        user_id = auth.uid() AND
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage user badges" ON user_badges
    FOR ALL USING (true);

-- Políticas para gamification_stats
CREATE POLICY "Tenant users can view gamification stats" ON gamification_stats
    FOR SELECT USING (
        tenant_id IN (
            SELECT id FROM tenants WHERE owner_id = auth.uid()
        )
    );

CREATE POLICY "System can manage gamification stats" ON gamification_stats
    FOR ALL USING (true);

-- FUNÇÕES RPC PARA GAMIFICAÇÃO

-- Função para verificar e conceder conquistas
CREATE OR REPLACE FUNCTION check_and_grant_achievements(
    p_tenant_id UUID,
    p_user_id UUID,
    p_activity_type TEXT,
    p_activity_value INTEGER DEFAULT 1
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_achievement RECORD;
    v_user_achievement RECORD;
    v_points_earned INTEGER := 0;
    v_achievements_granted JSONB := '[]'::JSONB;
    v_result JSONB;
BEGIN
    -- Buscar conquistas que podem ser concedidas
    FOR v_achievement IN 
        SELECT * FROM achievements 
        WHERE tenant_id = p_tenant_id 
        AND is_active = true
        AND (
            (requirement_type = 'count' AND p_activity_type = 'appointment') OR
            (requirement_type = 'streak' AND p_activity_type = 'streak') OR
            (requirement_type = 'amount' AND p_activity_type = 'revenue') OR
            (requirement_type = 'percentage' AND p_activity_type = 'satisfaction')
        )
    LOOP
        -- Verificar se o usuário já tem essa conquista
        SELECT * INTO v_user_achievement 
        FROM user_achievements 
        WHERE tenant_id = p_tenant_id 
        AND user_id = p_user_id 
        AND achievement_id = v_achievement.id;
        
        -- Se não tem a conquista ou não completou
        IF v_user_achievement IS NULL THEN
            -- Inserir nova conquista
            INSERT INTO user_achievements (tenant_id, user_id, achievement_id, progress)
            VALUES (p_tenant_id, p_user_id, v_achievement.id, p_activity_value);
            
            v_user_achievement.progress := p_activity_value;
        ELSE
            -- Atualizar progresso
            UPDATE user_achievements 
            SET progress = progress + p_activity_value,
                updated_at = NOW()
            WHERE id = v_user_achievement.id;
            
            v_user_achievement.progress := v_user_achievement.progress + p_activity_value;
        END IF;
        
        -- Verificar se completou a conquista
        IF v_user_achievement.progress >= v_achievement.requirement_value AND NOT v_user_achievement.completed THEN
            -- Marcar como completada
            UPDATE user_achievements 
            SET completed = true, 
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_user_achievement.id;
            
            -- Adicionar pontos
            v_points_earned := v_points_earned + v_achievement.points_reward;
            
            -- Adicionar à lista de conquistas concedidas
            v_achievements_granted := v_achievements_granted || jsonb_build_object(
                'id', v_achievement.id,
                'name', v_achievement.name,
                'description', v_achievement.description,
                'icon', v_achievement.icon,
                'points', v_achievement.points_reward
            );
        END IF;
    END LOOP;
    
    -- Atualizar pontos do usuário se ganhou algum
    IF v_points_earned > 0 THEN
        INSERT INTO user_points (tenant_id, user_id, total_points, experience_points)
        VALUES (p_tenant_id, p_user_id, v_points_earned, v_points_earned)
        ON CONFLICT (tenant_id, user_id) 
        DO UPDATE SET 
            total_points = user_points.total_points + v_points_earned,
            experience_points = user_points.experience_points + v_points_earned,
            updated_at = NOW();
        
        -- Registrar no histórico
        INSERT INTO points_history (tenant_id, user_id, points_earned, reason, source_type)
        VALUES (p_tenant_id, p_user_id, v_points_earned, 'Conquista desbloqueada', 'achievement');
    END IF;
    
    v_result := jsonb_build_object(
        'points_earned', v_points_earned,
        'achievements_granted', v_achievements_granted
    );
    
    RETURN v_result;
END;
$$;

-- Função para atualizar ranking de profissionais
CREATE OR REPLACE FUNCTION update_professional_ranking(p_tenant_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Atualizar estatísticas dos profissionais
    UPDATE professional_rankings pr
    SET 
        total_appointments = stats.total_appointments,
        completed_appointments = stats.completed_appointments,
        cancelled_appointments = stats.cancelled_appointments,
        average_rating = stats.average_rating,
        total_ratings = stats.total_ratings,
        total_revenue_cents = stats.total_revenue_cents,
        performance_score = stats.performance_score,
        updated_at = NOW()
    FROM (
        SELECT 
            p.id as professional_id,
            COUNT(a.id) as total_appointments,
            COUNT(CASE WHEN a.status = 'completed' THEN 1 END) as completed_appointments,
            COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) as cancelled_appointments,
            COALESCE(AVG(cr.rating), 0) as average_rating,
            COUNT(cr.id) as total_ratings,
            COALESCE(SUM(s.price_cents), 0) as total_revenue_cents,
            (
                COUNT(CASE WHEN a.status = 'completed' THEN 1 END) * 10 +
                COALESCE(AVG(cr.rating), 0) * 20 +
                COUNT(cr.id) * 5
            ) as performance_score
        FROM professionals p
        LEFT JOIN appointments a ON p.id = a.professional_id AND a.tenant_id = p_tenant_id
        LEFT JOIN services s ON a.service_id = s.id
        LEFT JOIN customer_reviews cr ON a.id = cr.appointment_id
        WHERE p.tenant_id = p_tenant_id AND p.active = true
        GROUP BY p.id
    ) stats
    WHERE pr.professional_id = stats.professional_id AND pr.tenant_id = p_tenant_id;
    
    -- Atualizar posição no ranking
    UPDATE professional_rankings pr
    SET ranking_position = ranked.rank
    FROM (
        SELECT 
            professional_id,
            ROW_NUMBER() OVER (ORDER BY performance_score DESC, total_appointments DESC) as rank
        FROM professional_rankings
        WHERE tenant_id = p_tenant_id
    ) ranked
    WHERE pr.professional_id = ranked.professional_id AND pr.tenant_id = p_tenant_id;
END;
$$;

-- Função para verificar desafios mensais
CREATE OR REPLACE FUNCTION check_monthly_challenges(p_tenant_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_challenge RECORD;
    v_progress RECORD;
    v_current_value INTEGER;
    v_challenges_completed JSONB := '[]'::JSONB;
BEGIN
    -- Buscar desafios ativos
    FOR v_challenge IN 
        SELECT * FROM monthly_challenges 
        WHERE tenant_id = p_tenant_id 
        AND is_active = true
        AND CURRENT_DATE BETWEEN start_date AND end_date
    LOOP
        -- Calcular valor atual baseado no tipo de desafio
        CASE v_challenge.challenge_type
            WHEN 'appointments' THEN
                SELECT COUNT(*) INTO v_current_value
                FROM appointments a
                WHERE a.tenant_id = p_tenant_id
                AND a.created_at >= v_challenge.start_date
                AND a.created_at <= v_challenge.end_date;
            WHEN 'revenue' THEN
                SELECT COALESCE(SUM(s.price_cents), 0) INTO v_current_value
                FROM appointments a
                JOIN services s ON a.service_id = s.id
                WHERE a.tenant_id = p_tenant_id
                AND a.status = 'completed'
                AND a.created_at >= v_challenge.start_date
                AND a.created_at <= v_challenge.end_date;
            WHEN 'satisfaction' THEN
                SELECT COALESCE(AVG(cr.rating), 0) INTO v_current_value
                FROM customer_reviews cr
                WHERE cr.tenant_id = p_tenant_id
                AND cr.created_at >= v_challenge.start_date
                AND cr.created_at <= v_challenge.end_date;
            ELSE
                v_current_value := 0;
        END CASE;
        
        -- Buscar ou criar progresso
        SELECT * INTO v_progress 
        FROM challenge_progress 
        WHERE tenant_id = p_tenant_id 
        AND user_id = p_user_id 
        AND challenge_id = v_challenge.id;
        
        IF v_progress IS NULL THEN
            INSERT INTO challenge_progress (tenant_id, user_id, challenge_id, current_progress)
            VALUES (p_tenant_id, p_user_id, v_challenge.id, v_current_value);
            v_progress.current_progress := v_current_value;
        ELSE
            UPDATE challenge_progress 
            SET current_progress = v_current_value,
                updated_at = NOW()
            WHERE id = v_progress.id;
            v_progress.current_progress := v_current_value;
        END IF;
        
        -- Verificar se completou o desafio
        IF v_progress.current_progress >= v_challenge.target_value AND NOT v_progress.completed THEN
            UPDATE challenge_progress 
            SET completed = true, 
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_progress.id;
            
            -- Adicionar pontos
            INSERT INTO user_points (tenant_id, user_id, total_points, experience_points)
            VALUES (p_tenant_id, p_user_id, v_challenge.reward_points, v_challenge.reward_points)
            ON CONFLICT (tenant_id, user_id) 
            DO UPDATE SET 
                total_points = user_points.total_points + v_challenge.reward_points,
                experience_points = user_points.experience_points + v_challenge.reward_points,
                updated_at = NOW();
            
            -- Registrar no histórico
            INSERT INTO points_history (tenant_id, user_id, points_earned, reason, source_type, source_id)
            VALUES (p_tenant_id, p_user_id, v_challenge.reward_points, 'Desafio mensal completado', 'achievement', v_challenge.id);
            
            -- Adicionar à lista de desafios completados
            v_challenges_completed := v_challenges_completed || jsonb_build_object(
                'id', v_challenge.id,
                'title', v_challenge.title,
                'description', v_challenge.description,
                'points', v_challenge.reward_points
            );
        END IF;
    END LOOP;
    
    RETURN jsonb_build_object(
        'challenges_completed', v_challenges_completed
    );
END;
$$;

-- Função para atualizar streaks do usuário
CREATE OR REPLACE FUNCTION update_user_streaks(p_tenant_id UUID, p_user_id UUID, p_streak_type TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_streak RECORD;
    v_current_streak INTEGER;
    v_streak_broken BOOLEAN := false;
    v_result JSONB;
BEGIN
    -- Buscar streak atual
    SELECT * INTO v_streak 
    FROM user_streaks 
    WHERE tenant_id = p_tenant_id 
    AND user_id = p_user_id 
    AND streak_type = p_streak_type;
    
    -- Calcular streak atual baseado no tipo
    CASE p_streak_type
        WHEN 'appointments' THEN
            SELECT COUNT(*) INTO v_current_streak
            FROM appointments a
            WHERE a.tenant_id = p_tenant_id
            AND a.created_at >= CURRENT_DATE - INTERVAL '7 days'
            AND a.status = 'completed';
        WHEN 'days_active' THEN
            SELECT COUNT(DISTINCT DATE(a.created_at)) INTO v_current_streak
            FROM appointments a
            WHERE a.tenant_id = p_tenant_id
            AND a.created_at >= CURRENT_DATE - INTERVAL '30 days';
        ELSE
            v_current_streak := 0;
    END CASE;
    
    -- Se não tem streak, criar
    IF v_streak IS NULL THEN
        INSERT INTO user_streaks (tenant_id, user_id, streak_type, current_streak, longest_streak, last_activity_date)
        VALUES (p_tenant_id, p_user_id, p_streak_type, v_current_streak, v_current_streak, CURRENT_DATE);
    ELSE
        -- Verificar se quebrou o streak
        IF v_streak.last_activity_date < CURRENT_DATE - INTERVAL '1 day' THEN
            v_streak_broken := true;
        END IF;
        
        -- Atualizar streak
        UPDATE user_streaks 
        SET 
            current_streak = CASE WHEN v_streak_broken THEN v_current_streak ELSE v_streak.current_streak + 1 END,
            longest_streak = GREATEST(
                CASE WHEN v_streak_broken THEN v_current_streak ELSE v_streak.current_streak + 1 END,
                v_streak.longest_streak
            ),
            last_activity_date = CURRENT_DATE,
            updated_at = NOW()
        WHERE id = v_streak.id;
    END IF;
    
    v_result := jsonb_build_object(
        'current_streak', v_current_streak,
        'streak_broken', v_streak_broken
    );
    
    RETURN v_result;
END;
$$;

-- Conceder permissões
GRANT EXECUTE ON FUNCTION check_and_grant_achievements(UUID, UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION update_professional_ranking(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_monthly_challenges(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION update_user_streaks(UUID, UUID, TEXT) TO authenticated;

-- Inserir conquistas padrão
INSERT INTO achievements (tenant_id, name, description, icon, category, requirement_type, requirement_value, requirement_period, points_reward) VALUES
-- Conquistas de Agendamentos
(NULL, 'Primeiro Agendamento', 'Realizou o primeiro agendamento', '🎯', 'appointments', 'count', 1, 'once', 50),
(NULL, 'Agendador Ativo', 'Realizou 10 agendamentos', '📅', 'appointments', 'count', 10, 'once', 100),
(NULL, 'Mestre dos Agendamentos', 'Realizou 50 agendamentos', '👑', 'appointments', 'count', 50, 'once', 500),
(NULL, 'Agendador Profissional', 'Realizou 100 agendamentos', '🏆', 'appointments', 'count', 100, 'once', 1000),

-- Conquistas de Clientes
(NULL, 'Primeiro Cliente', 'Atendeu o primeiro cliente', '👤', 'customers', 'count', 1, 'once', 25),
(NULL, 'Cliente Recorrente', 'Atendeu o mesmo cliente 3 vezes', '🔄', 'customers', 'count', 3, 'once', 150),
(NULL, 'Fiel ao Cliente', 'Atendeu o mesmo cliente 10 vezes', '💎', 'customers', 'count', 10, 'once', 500),

-- Conquistas de Receita
(NULL, 'Primeira Receita', 'Gerou a primeira receita', '💰', 'revenue', 'amount', 1000, 'once', 100),
(NULL, 'Receita Mensal', 'Gerou R$ 1000 em um mês', '📈', 'revenue', 'amount', 100000, 'monthly', 300),
(NULL, 'Receita Alta', 'Gerou R$ 5000 em um mês', '🚀', 'revenue', 'amount', 500000, 'monthly', 1000),

-- Conquistas de Qualidade
(NULL, 'Satisfação Perfeita', 'Manteve 100% de satisfação por 7 dias', '⭐', 'quality', 'percentage', 100, 'weekly', 200),
(NULL, 'Qualidade Consistente', 'Manteve 90% de satisfação por 30 dias', '🌟', 'quality', 'percentage', 90, 'monthly', 500),

-- Conquistas de Streak
(NULL, 'Semana Ativa', 'Manteve atividade por 7 dias seguidos', '🔥', 'loyalty', 'streak', 7, 'once', 200),
(NULL, 'Mês Ativo', 'Manteve atividade por 30 dias seguidos', '💪', 'loyalty', 'streak', 30, 'once', 1000);

-- Inserir badges padrão
INSERT INTO badges (tenant_id, name, description, icon, category, rarity) VALUES
-- Badges de Especialização
(NULL, 'Barbeiro Iniciante', 'Primeiros passos na barbearia', '✂️', 'specialization', 'common'),
(NULL, 'Barbeiro Experiente', 'Experiência comprovada', '🎯', 'specialization', 'rare'),
(NULL, 'Mestre Barbeiro', 'Mestre na arte da barbearia', '👑', 'specialization', 'epic'),
(NULL, 'Lenda da Barbearia', 'Lenda entre os barbeiros', '🏆', 'specialization', 'legendary'),

-- Badges de Qualidade
(NULL, 'Atendimento Perfeito', '100% de satisfação', '⭐', 'quality', 'rare'),
(NULL, 'Cliente Feliz', 'Muitos clientes satisfeitos', '😊', 'quality', 'common'),
(NULL, 'Profissional do Ano', 'Excelência em atendimento', '🏅', 'quality', 'epic'),

-- Badges de Milestone
(NULL, 'Primeiro Mês', 'Completou o primeiro mês', '📅', 'milestone', 'common'),
(NULL, 'Seis Meses', 'Completou 6 meses de atividade', '📊', 'milestone', 'rare'),
(NULL, 'Um Ano', 'Completou 1 ano de atividade', '🎉', 'milestone', 'epic');

COMMENT ON TABLE achievements IS 'Sistema de conquistas para gamificação';
COMMENT ON TABLE user_achievements IS 'Conquistas conquistadas pelos usuários';
COMMENT ON TABLE user_points IS 'Sistema de pontos e níveis dos usuários';
COMMENT ON TABLE points_history IS 'Histórico de pontos ganhos e gastos';
COMMENT ON TABLE professional_rankings IS 'Ranking e estatísticas dos profissionais';
COMMENT ON TABLE customer_reviews IS 'Avaliações dos clientes';
COMMENT ON TABLE monthly_challenges IS 'Desafios mensais para engajamento';
COMMENT ON TABLE challenge_progress IS 'Progresso dos usuários nos desafios';
COMMENT ON TABLE user_streaks IS 'Sequências de atividades dos usuários';
COMMENT ON TABLE badges IS 'Badges e especializações';
COMMENT ON TABLE user_badges IS 'Badges conquistados pelos usuários';
COMMENT ON TABLE gamification_stats IS 'Estatísticas gerais de gamificação';
