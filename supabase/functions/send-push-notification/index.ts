import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface NotificationPayload {
  token: string;
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
    const { token, notification, data, priority = 'high', ttl = 2419200 } = await req.json() as NotificationPayload

    if (!token || !notification || !notification.title || !notification.body) {
      throw new Error('Dados de notificação inválidos')
    }

    // Configuração do Firebase
    const FIREBASE_SERVER_KEY = Deno.env.get('FIREBASE_SERVER_KEY')
    if (!FIREBASE_SERVER_KEY) {
      throw new Error('Chave do servidor Firebase não configurada')
    }

    // Preparar payload para FCM
    const fcmPayload = {
      to: token,
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
        source: 'styleswift-pwa'
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

    // Enviar notificação via FCM
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
      console.error('FCM Error:', fcmResponse.status, errorText)
      throw new Error(`Erro ao enviar notificação: ${fcmResponse.status}`)
    }

    const fcmResult = await fcmResponse.json()
    
    // Verificar se a notificação foi enviada com sucesso
    if (fcmResult.success === 1) {
      // Registrar notificação enviada no banco
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: user.id,
          token: token,
          notification_type: data?.type || 'general',
          title: notification.title,
          body: notification.body,
          fcm_message_id: fcmResult.results?.[0]?.message_id,
          sent_at: new Date().toISOString(),
          status: 'sent'
        })

      return new Response(
        JSON.stringify({
          success: true,
          message_id: fcmResult.results?.[0]?.message_id,
          message: 'Notificação enviada com sucesso'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    } else {
      // Registrar erro no banco
      const error = fcmResult.results?.[0]?.error
      await supabaseClient
        .from('notification_logs')
        .insert({
          user_id: user.id,
          token: token,
          notification_type: data?.type || 'general',
          title: notification.title,
          body: notification.body,
          error: error,
          sent_at: new Date().toISOString(),
          status: 'failed'
        })

      // Se o token é inválido, removê-lo do banco
      if (error === 'InvalidRegistration' || error === 'NotRegistered') {
        await supabaseClient
          .from('fcm_tokens')
          .delete()
          .eq('token', token)
      }

      throw new Error(`Falha ao enviar notificação: ${error}`)
    }

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
