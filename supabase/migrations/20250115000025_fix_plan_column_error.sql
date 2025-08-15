-- Fix the plan column error - ensure tenants have proper plan_tier values
-- This migration replaces the problematic section in the previous migration

-- Update existing tenants to have proper plan_tier values if they don't have any
UPDATE public.tenants
SET 
  plan_tier = COALESCE(plan_tier, 'essential'),
  plan_status = COALESCE(plan_status, 'pending'),
  payment_completed = COALESCE(payment_completed, false)
WHERE plan_tier IS NULL OR plan_tier = '';

-- Ensure all tenants have valid plan_tier values
UPDATE public.tenants
SET plan_tier = 'essential'
WHERE plan_tier NOT IN ('essential', 'professional', 'premium');

-- Set default plan_status for tenants that don't have it
UPDATE public.tenants
SET plan_status = 'pending'
WHERE plan_status IS NULL OR plan_status = '';

-- Set default payment_completed for tenants that don't have it
UPDATE public.tenants
SET payment_completed = false
WHERE payment_completed IS NULL;

-- Ensure the plan column is completely removed if it exists
ALTER TABLE public.tenants DROP COLUMN IF EXISTS plan;

-- Add comment for documentation
COMMENT ON COLUMN public.tenants.plan_tier IS 'Current subscription plan tier (essential, professional, premium)';
COMMENT ON COLUMN public.tenants.plan_status IS 'Current subscription status (pending, active, cancelled, failed)';
COMMENT ON COLUMN public.tenants.payment_completed IS 'Whether the subscription payment has been completed';
