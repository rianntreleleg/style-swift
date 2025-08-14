-- Add plan-based permissions and RLS policies
-- This migration implements backend permission rules for different plan tiers

-- Function to check if user has access to financial dashboard
CREATE OR REPLACE FUNCTION check_financial_dashboard_access(tenant_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    tenant_plan text;
BEGIN
    SELECT plan_tier INTO tenant_plan
    FROM public.tenants
    WHERE id = tenant_id;
    
    -- Only professional and premium plans have access to financial dashboard
    RETURN tenant_plan IN ('professional', 'premium');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check professional limit
CREATE OR REPLACE FUNCTION check_professional_limit(tenant_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    tenant_plan text;
    current_count integer;
    max_allowed integer;
BEGIN
    SELECT plan_tier INTO tenant_plan
    FROM public.tenants
    WHERE id = tenant_id;
    
    -- Get current professional count
    SELECT COUNT(*) INTO current_count
    FROM public.professionals
    WHERE tenant_id = check_professional_limit.tenant_id;
    
    -- Set max allowed based on plan
    CASE tenant_plan
        WHEN 'essential' THEN max_allowed := 1;
        WHEN 'professional' THEN max_allowed := 3;
        WHEN 'premium' THEN max_allowed := 999;
        ELSE max_allowed := 1;
    END CASE;
    
    RETURN current_count < max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check bulk actions access
CREATE OR REPLACE FUNCTION check_bulk_actions_access(tenant_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    tenant_plan text;
BEGIN
    SELECT plan_tier INTO tenant_id
    FROM public.tenants
    WHERE id = tenant_id;
    
    -- Only professional and premium plans have access to bulk actions
    RETURN tenant_plan IN ('professional', 'premium');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check auto confirmation access
CREATE OR REPLACE FUNCTION check_auto_confirmation_access(tenant_id uuid)
RETURNS BOOLEAN AS $$
DECLARE
    tenant_plan text;
BEGIN
    SELECT plan_tier INTO tenant_plan
    FROM public.tenants
    WHERE id = tenant_id;
    
    -- Only professional and premium plans have access to auto confirmation
    RETURN tenant_plan IN ('professional', 'premium');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policy for professionals table - limit based on plan
DROP POLICY IF EXISTS "Tenant owners can manage professionals" ON public.professionals;
CREATE POLICY "Tenant owners can manage professionals" ON public.professionals
    FOR ALL USING (
        auth.uid() IN (
            SELECT owner_id FROM public.tenants WHERE id = tenant_id
        )
        AND check_professional_limit(tenant_id)
    );

-- RLS Policy for appointments bulk operations
DROP POLICY IF EXISTS "Tenant owners can manage appointments" ON public.appointments;
CREATE POLICY "Tenant owners can manage appointments" ON public.appointments
    FOR ALL USING (
        auth.uid() IN (
            SELECT owner_id FROM public.tenants WHERE id = tenant_id
        )
    );

-- Add a specific policy for bulk operations
CREATE POLICY "Tenant owners can bulk update appointments" ON public.appointments
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT owner_id FROM public.tenants WHERE id = tenant_id
        )
        AND check_bulk_actions_access(tenant_id)
    );

-- RLS Policy for financial data access
CREATE POLICY "Tenant owners can access financial data" ON public.appointments
    FOR SELECT USING (
        auth.uid() IN (
            SELECT owner_id FROM public.tenants WHERE id = tenant_id
        )
        AND check_financial_dashboard_access(tenant_id)
    );

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION check_financial_dashboard_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_professional_limit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_bulk_actions_access(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION check_auto_confirmation_access(uuid) TO authenticated;
