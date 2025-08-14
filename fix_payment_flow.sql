-- MANUAL FIX FOR PAYMENT FLOW ISSUES
-- Run this in your Supabase SQL Editor to fix existing payment issues

-- 1. First, let's see the current state
SELECT 
    'Current State' as info,
    COUNT(*) as total_tenants,
    COUNT(CASE WHEN plan_status = 'active' THEN 1 END) as active_tenants,
    COUNT(CASE WHEN payment_completed = true THEN 1 END) as paid_tenants,
    COUNT(CASE WHEN plan_tier IN ('essential', 'professional', 'premium') THEN 1 END) as valid_plans
FROM public.tenants;

-- 2. Show tenants with payment issues
SELECT 
    t.id,
    t.name,
    t.owner_id,
    t.plan,
    t.plan_tier,
    t.plan_status,
    t.payment_completed,
    t.stripe_customer_id,
    s.subscription_tier as subscriber_plan,
    s.subscribed
FROM public.tenants t
LEFT JOIN public.subscribers s ON t.owner_id = s.user_id
WHERE (t.plan_status != 'active' OR t.plan != s.subscription_tier)
    AND s.subscribed = true;

-- 3. Fix tenants that have payments but wrong plan status
UPDATE public.tenants 
SET 
    plan = s.subscription_tier,
    plan_tier = s.subscription_tier,
    plan_status = 'active',
    payment_completed = true,
    updated_at = now()
FROM public.subscribers s
WHERE tenants.owner_id = s.user_id 
    AND s.subscribed = true 
    AND s.subscription_tier IS NOT NULL
    AND (tenants.plan_status != 'active' OR tenants.plan != s.subscription_tier);

-- 4. Create missing subscriptions for existing payments
INSERT INTO public.subscriptions (
    tenant_id,
    stripe_subscription_id,
    plan_tier,
    status,
    current_period_start,
    current_period_end
)
SELECT 
    t.id,
    COALESCE(t.stripe_subscription_id, 'manual_' || t.id::text),
    t.plan_tier,
    'active',
    t.created_at,
    t.created_at + interval '1 month'
FROM public.tenants t
WHERE t.payment_completed = true 
    AND t.plan_status = 'active'
    AND NOT EXISTS (
        SELECT 1 FROM public.subscriptions s 
        WHERE s.tenant_id = t.id
    );

-- 5. Verify the fix worked
SELECT 
    'After Fix' as info,
    COUNT(*) as total_tenants,
    COUNT(CASE WHEN plan_status = 'active' THEN 1 END) as active_tenants,
    COUNT(CASE WHEN payment_completed = true THEN 1 END) as paid_tenants,
    COUNT(CASE WHEN plan_tier IN ('essential', 'professional', 'premium') THEN 1 END) as valid_plans
FROM public.tenants;

-- 6. Show fixed tenants
SELECT 
    t.id,
    t.name,
    t.plan,
    t.plan_tier,
    t.plan_status,
    t.payment_completed,
    s.subscription_tier as subscriber_plan,
    s.subscribed
FROM public.tenants t
LEFT JOIN public.subscribers s ON t.owner_id = s.user_id
WHERE t.plan_status = 'active' AND s.subscribed = true;
