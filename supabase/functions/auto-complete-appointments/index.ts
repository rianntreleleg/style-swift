// Edge Function para conclusão automática de agendamentos
// Esta função é executada via cron para marcar agendamentos confirmados como concluídos após 24 horas

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
    // Verificar se é uma requisição autorizada (cron ou manual)
    const authHeader = req.headers.get('authorization')
    const isCronRequest = req.headers.get('x-cron-secret') === Deno.env.get('CRON_SECRET')
    
    if (!authHeader && !isCronRequest) {
      throw new Error('Unauthorized - Requisição não autorizada')
    }

    // Criar cliente Supabase
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    console.log('[AUTO-COMPLETE] Iniciando processamento de conclusões automáticas...')

    // Executar função RPC para processar conclusões
    const { data: result, error: rpcError } = await supabaseClient.rpc('process_pending_completions')

    if (rpcError) {
      console.error('[AUTO-COMPLETE] Erro na função RPC:', rpcError)
      throw new Error(`Erro no processamento: ${rpcError.message}`)
    }

    console.log('[AUTO-COMPLETE] Resultado do processamento:', result)

    // Verificar se o processamento foi bem-sucedido
    if (!result || !result.success) {
      throw new Error('Falha no processamento de conclusões automáticas')
    }

    const response = {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
      message: `Processamento concluído com sucesso. ${result.completed_count || 0} agendamentos concluídos automaticamente.`
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('[AUTO-COMPLETE] Erro:', error)
    
    const errorResponse = {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
      message: 'Erro no processamento de conclusões automáticas'
    }

    return new Response(
      JSON.stringify(errorResponse),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
