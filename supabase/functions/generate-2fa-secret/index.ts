import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { generateSecret, generateTOTPURI } from 'https://esm.sh/otplib@12.0.1'

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

    // Generate secret for authenticator app
    const secret = generateSecret()
    
    // Generate QR code URI
    const user = await supabaseClient.auth.getUser()
    const email = user.data.user?.email || 'user@example.com'
    
    const totpUri = generateTOTPURI(secret, email, 'BarberSalon SaaS', {
      issuer: 'BarberSalon SaaS',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    })

    // Generate QR code data URL
    const qrCodeData = `data:image/png;base64,${btoa(totpUri)}`

    return new Response(
      JSON.stringify({
        secret,
        qrCode: qrCodeData,
        totpUri
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
