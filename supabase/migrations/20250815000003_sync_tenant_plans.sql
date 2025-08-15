  -- FUNÇÃO PARA SINCRONIZAR DADOS DE PLANO EM TODOS OS TENANTS

  -- Esta função corrige possíveis inconsistências nos dados de plano dos tenants
  CREATE OR REPLACE FUNCTION sync_all_tenant_plans()
  RETURNS void
  LANGUAGE plpgsql
  AS $function$
  BEGIN
    -- 1. Garantir que plan e plan_tier estão sincronizados
    -- Se plan_tier estiver preenchido e plan estiver vazio ou diferente, atualizar plan
    UPDATE public.tenants 
    SET plan = plan_tier
    WHERE plan_tier IS NOT NULL 
      AND (plan IS NULL OR plan != plan_tier);
    
    -- Se plan estiver preenchido e plan_tier estiver vazio ou diferente, atualizar plan_tier
    UPDATE public.tenants 
    SET plan_tier = plan
    WHERE plan IS NOT NULL 
      AND (plan_tier IS NULL OR plan_tier != plan);
    
    -- 2. Garantir que todos os tenants tenham plan preenchido
    UPDATE public.tenants 
    SET plan = 'essential'
    WHERE plan IS NULL;
    
    -- 3. Garantir que todos os tenants tenham plan_tier preenchido
    UPDATE public.tenants 
    SET plan_tier = 'essential'
    WHERE plan_tier IS NULL;
    
    -- 4. Sincronizar plan_status com payment_status
    UPDATE public.tenants 
    SET plan_status = CASE 
      WHEN payment_status = 'paid' THEN 'active'
      WHEN payment_status = 'pending' THEN 'pending'
      ELSE 'inactive'
    END
    WHERE plan_status IS NULL OR plan_status != CASE 
      WHEN payment_status = 'paid' THEN 'active'
      WHEN payment_status = 'pending' THEN 'pending'
      ELSE 'inactive'
    END;
    
    -- 5. Sincronizar payment_completed com payment_status
    UPDATE public.tenants 
    SET payment_completed = (payment_status = 'paid')
    WHERE payment_completed IS NULL OR payment_completed != (payment_status = 'paid');
    
    RAISE NOTICE 'Sincronização de planos concluída com sucesso';
  END;
  $function$;

  -- Executar a sincronização
  SELECT sync_all_tenant_plans();

  -- Verificar resultados
  SELECT 
    'Verificação pós-sincronização' as info,
    COUNT(*) as total_tenants,
    COUNT(CASE WHEN plan = plan_tier THEN 1 END) as synced_plan_fields,
    COUNT(CASE WHEN plan IS NOT NULL THEN 1 END) as tenants_with_plan,
    COUNT(CASE WHEN plan_tier IS NOT NULL THEN 1 END) as tenants_with_plan_tier,
    COUNT(CASE WHEN plan_status = 'active' AND payment_status = 'paid' THEN 1 END) as active_paid_tenants,
    COUNT(CASE WHEN payment_completed = (payment_status = 'paid') THEN 1 END) as synced_payment_status
  FROM public.tenants;  