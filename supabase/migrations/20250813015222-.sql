-- Atualizar função check-subscription para atualizar tenant
-- Primeiro vamos criar uma função SQL que será chamada pela edge function

CREATE OR REPLACE FUNCTION public.update_tenant_subscription(
  p_user_id UUID,
  p_subscription_tier TEXT,
  p_subscribed BOOLEAN
) RETURNS VOID AS $$
BEGIN
  -- Atualizar o tenant do usuário com os dados da assinatura
  UPDATE tenants 
  SET 
    plan_tier = p_subscription_tier,
    plan_status = CASE WHEN p_subscribed THEN 'active' ELSE 'inactive' END,
    updated_at = now()
  WHERE owner_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;