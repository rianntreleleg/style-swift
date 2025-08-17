import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BulkNotificationPayload {
  tenant_id: string;
  notification: {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    click_action?: string;
  };
  data?: Record<string, string>;
  priority?: 'normal' | 'high';
  ttl?: number;
  user_ids?: string[]; // IDs específicos de usuários (opcional)
  notification_type?: string;
}

interface FCMResponse {
  success: boolean;
  message_id?: string;
  error?: string;
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

    // Verificar autorização
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Token de autorização não fornecido')
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verificar se o usuário está autenticado
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Usuário não autenticado')
    }

    // Obter dados da requisição
    const { 
      tenant_id, 
      notification, 
      data, 
      priority = 'high', 
      ttl = 2419200,
      user_ids,
      notification_type = 'general'
    } = await req.json() as BulkNotificationPayload

    if (!tenant_id || !notification || !notification.title || !notification.body) {
      throw new Error('Dados de notificação inválidos')
    }

    // Configuração do Firebase
    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')
    if (!FIREBASE_SERVER_KEY) {
      throw new Error('Chave do servidor Firebase não configurada')
    }

    // Buscar tokens FCM dos usuários
    let tokensQuery = supabaseClient
      .from('fcm_tokens')
      .select('user_id, token, device_info')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)

    // Filtrar por usuários específicos se fornecido
    if (user_ids && user_ids.length > 0) {
      tokensQuery = tokensQuery.in('user_id', user_ids)
    }

    const { data: tokens, error: tokensError } = await tokensQuery

    if (tokensError) {
      throw new Error(`Erro ao buscar tokens: ${tokensError.message}`)
    }

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Nenhum token encontrado para envio',
          sent_count: 0,
          total_count: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    // Preparar payload base para FCM
    const baseFcmPayload = {
      notification: {
        title: notification.title,
        body: notification.body,
        icon: notification.icon || '/icons/icon-192x192.png',
        badge: notification.badge || '/icons/icon-72x72.png',
        click_action: notification.click_action || '/admin',
        sound: 'default'
      },
      data: {
        ...data,
        timestamp: Date.now().toString(),
        source: 'styleswift-pwa',
        notification_type: notification_type
      },
      priority: priority,
      ttl: ttl,
      android: {
        priority: priority,
        notification: {
          sound: 'default',
          channel_id: 'styleswift-notifications',
          priority: priority === 'high' ? 'high' : 'default',
          default_sound: true,
          default_vibrate_timings: true,
          default_light_settings: true
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
            content_available: true,
            mutable_content: true
          }
        },
        fcm_options: {
          image: notification.icon
        }
      },
      webpush: {
        notification: {
          icon: notification.icon,
          badge: notification.badge,
          vibrate: [100, 50, 100],
          require_interaction: true,
          silent: false,
          tag: 'styleswift-notification',
          renotify: true,
          actions: [
            {
              action: 'view',
              title: 'Ver Detalhes',
              icon: '/icons/calendar-shortcut.png'
            },
            {
              action: 'dismiss',
              title: 'Fechar',
              icon: '/icons/close.png'
            }
          ]
        },
        fcm_options: {
          link: notification.click_action || '/admin'
        }
      }
    }

    // Enviar notificações em lotes
    const batchSize = 1000 // FCM suporta até 1000 tokens por requisição
    const batches = []
    
    for (let i = 0; i < tokens.length; i += batchSize) {
      batches.push(tokens.slice(i, i + batchSize))
    }

    const results = {
      success: true,
      sent_count: 0,
      failed_count: 0,
      total_count: tokens.length,
      batches_processed: batches.length,
      errors: [] as string[]
    }

    // Processar cada lote
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      const batchTokens = batch.map(t => t.token)

      // Preparar payload para o lote
      const fcmPayload = {
        ...baseFcmPayload,
        registration_ids: batchTokens
      }

      try {
        // Enviar lote via FCM
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
          method: 'POST',
          headers: {
            'Authorization': `key=${FIREBASE_SERVER_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(fcmPayload)
        })

        if (!fcmResponse.ok) {
          const errorText = await fcmResponse.text()
          console.error('FCM Batch Error:', fcmResponse.status, errorText)
          results.errors.push(`Lote ${batchIndex + 1}: HTTP ${fcmResponse.status}`)
          results.failed_count += batch.length
          continue
        }

        const fcmResult = await fcmResponse.json()

        // Processar resultados do lote
        if (fcmResult.success === batch.length) {
          // Todos os tokens do lote foram enviados com sucesso
          results.sent_count += batch.length
        } else {
          // Alguns tokens falharam
          const successCount = fcmResult.success || 0
          const failureCount = batch.length - successCount
          
          results.sent_count += successCount
          results.failed_count += failureCount

          // Processar tokens inválidos
          if (fcmResult.results) {
            const invalidTokens = []
            for (let i = 0; i < fcmResult.results.length; i++) {
              const result = fcmResult.results[i]
              if (result.error === 'InvalidRegistration' || result.error === 'NotRegistered') {
                invalidTokens.push(batch[i].token)
              }
            }

            // Remover tokens inválidos do banco
            if (invalidTokens.length > 0) {
              await supabaseClient
                .from('fcm_tokens')
                .delete()
                .in('token', invalidTokens)
            }
          }
        }

        // Registrar logs para cada token do lote
        const logs = batch.map((tokenData, index) => {
          const fcmResult = fcmResult.results?.[index]
          return {
            user_id: tokenData.user_id,
            token: tokenData.token,
            notification_type: notification_type,
            title: notification.title,
            body: notification.body,
            fcm_message_id: fcmResult?.message_id,
            error: fcmResult?.error,
            sent_at: new Date().toISOString(),
            status: fcmResult?.error ? 'failed' : 'sent'
          }
        })

        await supabaseClient
          .from('notification_logs')
          .insert(logs)

      } catch (error) {
        console.error(`Erro no lote ${batchIndex + 1}:`, error)
        results.errors.push(`Lote ${batchIndex + 1}: ${error.message}`)
        results.failed_count += batch.length
      }
    }

    return new Response(
      JSON.stringify(results),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Error:', error.message)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})
