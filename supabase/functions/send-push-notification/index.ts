import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      throw new Error('Método não permitido')
    }

    // Obter dados da requisição
    const { tenantId, title, body, data, tokens } = await req.json()

    if (!tenantId || !title || !body) {
      throw new Error('Dados obrigatórios não fornecidos')
    }

    // Configuração do Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Configuração do Firebase
    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')
    if (!FIREBASE_SERVER_KEY) {
      throw new Error('Chave do servidor Firebase não configurada')
    }

    // Obter tokens FCM ativos do tenant
    let targetTokens = tokens
    if (!targetTokens || targetTokens.length === 0) {
      const { data: fcmTokens, error: fcmError } = await supabase
        .rpc('get_active_fcm_tokens', { p_tenant_id: tenantId })

      if (fcmError) {
        throw new Error(`Erro ao obter tokens FCM: ${fcmError.message}`)
      }

      targetTokens = fcmTokens.map((token: any) => token.token)
    }

    if (!targetTokens || targetTokens.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Nenhum token FCM ativo encontrado para este tenant' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404
        }
      )
    }

    // Preparar payload da notificação
    const notificationPayload = {
      notification: {
        title: title,
        body: body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        click_action: '/admin',
        tag: 'styleswift-notification',
        renotify: true,
        require_interaction: true,
        silent: false,
        vibrate: [100, 50, 100]
      },
      data: {
        ...data,
        timestamp: new Date().toISOString(),
        source: 'styleswift-pwa',
        tenant_id: tenantId
      },
      priority: 'high',
      content_available: true,
      mutable_content: true
    }

    // Enviar notificação para cada token
    const results = []
    const batchSize = 500 // Firebase permite até 500 tokens por requisição

    for (let i = 0; i < targetTokens.length; i += batchSize) {
      const batch = targetTokens.slice(i, i + batchSize)
      
      const fcmPayload = {
        registration_ids: batch,
        ...notificationPayload
      }

      const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${FIREBASE_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload)
      })

      if (!fcmResponse.ok) {
        const errorText = await fcmResponse.text()
        throw new Error(`Erro ao enviar para FCM: ${fcmResponse.status} - ${errorText}`)
      }

      const fcmResult = await fcmResponse.json()
      results.push(fcmResult)

      // Processar tokens inválidos
      if (fcmResult.failure > 0) {
        const invalidTokens = []
        fcmResult.results.forEach((result: any, index: number) => {
          if (result.error === 'InvalidRegistration' || result.error === 'NotRegistered') {
            invalidTokens.push(batch[index])
          }
        })

        // Marcar tokens inválidos como inativos
        if (invalidTokens.length > 0) {
          for (const token of invalidTokens) {
            await supabase.rpc('deactivate_fcm_token', { p_token: token })
          }
        }
      }
    }

    // Registrar log da notificação
    const { error: logError } = await supabase
      .from('notification_logs')
      .insert({
        tenant_id: tenantId,
        type: 'push_notification',
        title: title,
        message: body,
        data: data,
        tokens_sent: targetTokens.length,
        success: true,
        created_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Erro ao registrar log:', logError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notificação enviada para ${targetTokens.length} dispositivos`,
        results: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Erro ao enviar push notification:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
