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
    const { tenantId, ipAddress, duration } = await req.json()

    if (!tenantId || !ipAddress) {
      throw new Error('Missing required parameters')
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

    // Create security event for blocked IP
    const { error: eventError } = await supabaseClient
      .from('security_events')
      .insert({
        tenant_id: tenantId,
        type: 'blocked_ip',
        severity: 'high',
        description: `IP address ${ipAddress} blocked for ${duration || 15} minutes`,
        ip_address: ipAddress,
        user_agent: req.headers.get('user-agent') || '',
        timestamp: new Date().toISOString(),
        resolved: false
      })

    if (eventError) {
      throw new Error('Failed to create security event')
    }

    // In production, you would integrate with your firewall/security service
    // For now, we'll just log the action
    console.log(`IP ${ipAddress} blocked for tenant ${tenantId} for ${duration || 15} minutes`)

    // You could also store blocked IPs in a separate table for rate limiting
    // const { error: blockError } = await supabaseClient
    //   .from('blocked_ips')
    //   .insert({
    //     tenant_id: tenantId,
    //     ip_address: ipAddress,
    //     blocked_until: new Date(Date.now() + (duration || 15) * 60 * 1000).toISOString(),
    //     reason: 'Security violation'
    //   })

    return new Response(
      JSON.stringify({
        success: true,
        message: `IP address ${ipAddress} has been blocked for ${duration || 15} minutes`
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
