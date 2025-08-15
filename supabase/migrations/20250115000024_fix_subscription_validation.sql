-- Add payment validation columns to tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS payment_completed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'essential' CHECK (plan_tier IN ('essential', 'professional', 'premium')),
ADD COLUMN IF NOT EXISTS plan_status text NOT NULL DEFAULT 'pending' CHECK (plan_status IN ('pending', 'active', 'cancelled', 'failed')),
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS current_period_start timestamptz,
ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- Create function to validate plan access
CREATE OR REPLACE FUNCTION public.validate_plan_access(tenant_id uuid, required_plan text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = tenant_id
    AND plan_tier = required_plan
    AND plan_status = 'active'
    AND payment_completed = true
    AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if plan is active
CREATE OR REPLACE FUNCTION public.is_plan_active(tenant_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenants
    WHERE id = tenant_id
    AND plan_status = 'active'
    AND payment_completed = true
    AND (current_period_end IS NULL OR current_period_end > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to enforce plan limits
CREATE OR REPLACE FUNCTION public.enforce_plan_limits()
RETURNS trigger AS $$
DECLARE
  tenant_plan text;
  tenant_status text;
  tenant_payment_completed boolean;
  tenant_period_end timestamptz;
BEGIN
  -- Get tenant plan details
  SELECT plan_tier, plan_status, payment_completed, current_period_end
  INTO tenant_plan, tenant_status, tenant_payment_completed, tenant_period_end
  FROM public.tenants
  WHERE id = NEW.tenant_id;

  -- Check if plan is active and paid
  IF tenant_status != 'active' OR NOT tenant_payment_completed OR (tenant_period_end IS NOT NULL AND tenant_period_end <= now()) THEN
    RAISE EXCEPTION 'Plan is not active or payment is not completed';
  END IF;

  -- Check professional limits based on plan
  IF TG_TABLE_NAME = 'professionals' THEN
    IF tenant_plan = 'essential' AND (SELECT COUNT(*) FROM professionals WHERE tenant_id = NEW.tenant_id) >= 1 THEN
      RAISE EXCEPTION 'Essential plan allows only 1 professional';
    ELSIF tenant_plan = 'professional' AND (SELECT COUNT(*) FROM professionals WHERE tenant_id = NEW.tenant_id) >= 3 THEN
      RAISE EXCEPTION 'Professional plan allows up to 3 professionals';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to professionals table
DROP TRIGGER IF EXISTS trg_enforce_plan_limits ON public.professionals;
CREATE TRIGGER trg_enforce_plan_limits
  BEFORE INSERT OR UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_plan_limits();

-- Note: Plan column migration moved to separate migration file to avoid conflicts
-- See migration 20250115000025_fix_plan_column_error.sql
