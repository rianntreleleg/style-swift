import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { tenantId } = await req.json()

    if (!tenantId) {
      throw new Error('Missing tenant ID')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get tenant subscription details
    const { data: tenant, error: tenantError } = await supabaseClient
      .from('tenants')
      .select('plan_tier, plan_status, payment_completed, current_period_end')
      .eq('id', tenantId)
      .single()

    if (tenantError) {
      throw new Error('Failed to get tenant details')
    }

    if (!tenant) {
      throw new Error('Tenant not found')
    }

    // Check if plan is active and paid
    const isActive = tenant.plan_status === 'active' && 
                    tenant.payment_completed && 
                    (!tenant.current_period_end || new Date(tenant.current_period_end) > new Date())

    // If not active, update tenant status
    if (!isActive) {
      const { error: updateError } = await supabaseClient
        .from('tenants')
        .update({
          plan_status: 'pending',
          payment_completed: false
        })
        .eq('id', tenantId)

      if (updateError) {
        console.error('Failed to update tenant status:', updateError)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        isActive,
        plan: tenant.plan_tier,
        status: tenant.plan_status,
        paymentCompleted: tenant.payment_completed,
        periodEnd: tenant.current_period_end
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
