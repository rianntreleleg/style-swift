-- Fix RLS policy for tenants to allow users to create their own tenants
DROP POLICY IF EXISTS "Owner can manage their tenant" ON public.tenants;

-- Allow users to insert tenants with their own user_id as owner_id
CREATE POLICY "Users can create their own tenant" 
ON public.tenants 
FOR INSERT 
WITH CHECK (auth.uid() = owner_id);

-- Allow users to update/delete their own tenants
CREATE POLICY "Users can manage their own tenant" 
ON public.tenants 
FOR ALL 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);