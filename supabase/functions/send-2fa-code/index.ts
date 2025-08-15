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
    const { userId, methodType } = await req.json()

    if (!userId || !methodType) {
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

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    
    // Get user info
    const { data: { user } } = await supabaseClient.auth.getUser()
    
    if (!user) {
      throw new Error('User not found')
    }

    // Store the code temporarily (in production, use Redis or similar)
    // For now, we'll store it in the user_two_factor table
    const { error: upsertError } = await supabaseClient
      .from('user_two_factor')
      .upsert({
        user_id: userId,
        method_type: methodType,
        enabled: false,
        verified: false,
        secret_key: code, // Temporarily store code here
        email: methodType === 'email' ? user.email : null,
        phone_number: methodType === 'sms' ? user.phone : null
      })

    if (upsertError) {
      throw new Error('Failed to store verification code')
    }

    // In production, integrate with actual SMS/Email services
    // For now, we'll just return the code for testing
    let message = ''
    
    if (methodType === 'sms') {
      message = `Your BarberSalon verification code is: ${code}`
      // TODO: Integrate with Twilio, SendGrid, etc.
      console.log(`SMS to ${user.phone}: ${message}`)
    } else if (methodType === 'email') {
      message = `Your BarberSalon verification code is: ${code}`
      // TODO: Integrate with SendGrid, AWS SES, etc.
      console.log(`Email to ${user.email}: ${message}`)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent successfully',
        code: code // Remove this in production
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
