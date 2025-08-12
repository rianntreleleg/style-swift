-- CRITICAL SECURITY FIXES

-- 1. Enable RLS on subscriptions table and create proper policies
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies for subscriptions table
CREATE POLICY "Users can view their own subscriptions"
ON public.subscriptions
FOR SELECT
USING (
  tenant_id IN (
    SELECT id FROM public.tenants WHERE owner_id = auth.uid()
  )
);

CREATE POLICY "System can insert subscriptions"
ON public.subscriptions
FOR INSERT
WITH CHECK (true); -- Webhooks need to insert

CREATE POLICY "System can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (true); -- Webhooks need to update

-- 2. Secure database functions by adding search_path protection
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_professional_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $function$
declare
  v_plan text;
  v_count int;
  v_limit int;
begin
  select plan_tier into v_plan from public.tenants where id = NEW.tenant_id;
  select count(*) into v_count from public.professionals where tenant_id = NEW.tenant_id and active is true;
  v_limit := case v_plan
    when 'essential' then 1
    when 'professional' then 3
    when 'premium' then 1000000
    else 0
  end;
  if v_count >= v_limit then
    raise exception 'Limite de profissionais atingido para o plano %', v_plan;
  end if;
  return NEW;
end;
$function$;

-- 3. Tighten overly permissive RLS policies

-- Remove overly broad public policies and replace with more restrictive ones
DROP POLICY IF EXISTS "Public can create appointments" ON public.appointments;
DROP POLICY IF EXISTS "Public can view appointments by tenant (read-only)" ON public.appointments;

-- Create more restrictive appointment policies
CREATE POLICY "Public can create appointments for valid tenants"
ON public.appointments
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = appointments.tenant_id 
    AND t.plan_status = 'active'
  )
);

CREATE POLICY "Public can view appointments for active tenants only"
ON public.appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = appointments.tenant_id 
    AND t.plan_status = 'active'
  )
);

-- Restrict public tenant access to only active tenants
DROP POLICY IF EXISTS "Public can view tenants" ON public.tenants;

CREATE POLICY "Public can view active tenants only"
ON public.tenants
FOR SELECT
USING (plan_status = 'active' OR plan_status IS NULL);

-- Restrict public access to services and professionals to active tenants only
DROP POLICY IF EXISTS "Public can view services" ON public.services;
DROP POLICY IF EXISTS "Public can view professionals" ON public.professionals;

CREATE POLICY "Public can view services from active tenants"
ON public.services
FOR SELECT
USING (
  active = true AND 
  EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = services.tenant_id 
    AND (t.plan_status = 'active' OR t.plan_status IS NULL)
  )
);

CREATE POLICY "Public can view professionals from active tenants"
ON public.professionals
FOR SELECT
USING (
  active = true AND 
  EXISTS (
    SELECT 1 FROM public.tenants t 
    WHERE t.id = professionals.tenant_id 
    AND (t.plan_status = 'active' OR t.plan_status IS NULL)
  )
);