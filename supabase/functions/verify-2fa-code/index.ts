import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verify } from 'https://esm.sh/otplib@12.0.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, methodType, code, secretKey } = await req.json()

    if (!userId || !methodType || !code) {
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

    let isValid = false

    if (methodType === 'authenticator') {
      // Verify TOTP code for authenticator apps
      if (!secretKey) {
        throw new Error('Secret key required for authenticator verification')
      }
      
      isValid = verify(code, secretKey)
    } else {
      // Verify SMS/Email codes
      const { data: twoFactorData, error } = await supabaseClient
        .from('user_two_factor')
        .select('*')
        .eq('user_id', userId)
        .eq('method_type', methodType)
        .single()

      if (error || !twoFactorData) {
        throw new Error('2FA method not found')
      }

      // Compare the stored code with the provided code
      isValid = twoFactorData.secret_key === code
    }

    if (!isValid) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Invalid verification code' 
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    // Update 2FA record to mark as verified
    const { error: updateError } = await supabaseClient
      .from('user_two_factor')
      .update({
        enabled: true,
        verified: true,
        secret_key: methodType === 'authenticator' ? secretKey : null
      })
      .eq('user_id', userId)
      .eq('method_type', methodType)

    if (updateError) {
      throw new Error('Failed to update 2FA status')
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: '2FA verification successful'
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
