// NOVO WEBHOOK SIMPLIFICADO - TENANT JÁ EXISTE, SÓ ATUALIZAR STATUS
// Este webhook implementa o novo fluxo: tenant é criado ANTES do checkout

// @ts-ignore - Deno environment
// deno-lint-ignore-file no-explicit-any
// @ts-ignore - ESM imports
import Stripe from "https://esm.sh/stripe@14.21.0";
// @ts-ignore - ESM imports
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

// @ts-ignore - Deno environment
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
// @ts-ignore - Deno environment
const STRIPE_WEBHOOK_SECRET = Deno.env.get("SUBSCRIPTION_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
// @ts-ignore - Deno environment
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
// @ts-ignore - Deno environment
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-04-10" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapeamento de produtos para planos
const PRODUCT_TO_PLAN_MAP: Record<string, string> = {
  "prod_SqqVGzUIvJPVpt": "essential",
  "prod_professional": "professional",
  "prod_premium": "premium",
};

function getPlanFromAmount(amount: number): string {
  if (amount >= 7990) return "premium";    // R$ 79.90
  if (amount >= 4390) return "professional"; // R$ 43.90
  return "essential";
}

function getPlanFromProduct(productId: string): string {
  const plan = PRODUCT_TO_PLAN_MAP[productId];
  if (plan) {
    console.log(`[WEBHOOK] ✅ Product ID ${productId} mapeado para plano: ${plan}`);
    return plan;
  }
  
  console.log(`[WEBHOOK] 🔥 IMPORTANTE - Product ID real encontrado: ${productId} - ADICIONE AO MAPEAMENTO!`);
  return "professional"; // Fallback padrão
}

// NOVA FUNÇÃO SIMPLIFICADA: Processar checkout.session.completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log(`[WEBHOOK] 🎯 NOVO FLUXO - Processando checkout.session.completed`);
  
  if (session.mode !== 'subscription') {
    console.log('[WEBHOOK] ⏭️ Ignorando checkout que não é de assinatura');
    return true;
  }

  const customerId = session.customer as string;
  const subscriptionId = session.subscription as string;
  const tenantId = session.metadata?.tenantId;

  if (!customerId || !subscriptionId) {
    console.error(`[WEBHOOK] ❌ Dados insuficientes: customer=${customerId}, subscription=${subscriptionId}`);
    return false;
  }

  console.log(`[WEBHOOK] 📊 Dados recebidos:`);
  console.log(`[WEBHOOK] - Customer ID: ${customerId}`);
  console.log(`[WEBHOOK] - Subscription ID: ${subscriptionId}`);
  console.log(`[WEBHOOK] - Tenant ID (metadados): ${tenantId}`);
  console.log(`[WEBHOOK] - Amount: ${session.amount_total}`);

  try {
    // 1. REGISTRAR EVENTO NA TABELA DE AUDITORIA
    console.log(`[WEBHOOK] 📝 Registrando evento na tabela de auditoria`);
    const { error: eventError } = await supabase
      .from('stripe_events')
      .insert({
        event_id: `checkout_${session.id}`,
        event_type: 'checkout.session.completed',
        tenant_id: tenantId || null,
        stripe_data: session,
        processed: false
      });

    if (eventError) {
      console.error(`[WEBHOOK] ⚠️ Erro ao registrar evento (continuando...):`, eventError);
    }

    // 2. BUSCAR SUBSCRIPTION NO STRIPE
    console.log(`[WEBHOOK] 🔍 Buscando subscription no Stripe: ${subscriptionId}`);
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const productId = subscription.items.data[0]?.price.product as string;
    const priceId = subscription.items.data[0]?.price.id;
    
    console.log(`[WEBHOOK] 📦 Dados da subscription:`);
    console.log(`[WEBHOOK] - Product ID: ${productId}`);
    console.log(`[WEBHOOK] - Price ID: ${priceId}`);
    console.log(`[WEBHOOK] - Status: ${subscription.status}`);

    // 3. DETERMINAR PLANO
    let planTier = getPlanFromProduct(productId);
    
    // Fallback: determinar pelo valor se produto não estiver mapeado
    if (planTier === "essential" && session.amount_total) {
      const planFromAmount = getPlanFromAmount(session.amount_total);
      console.log(`[WEBHOOK] 💰 Plano pelo valor (${session.amount_total}): ${planFromAmount}`);
      planTier = planFromAmount;
    }

    console.log(`[WEBHOOK] 🎯 Plano identificado: ${planTier}`);

    // 4. BUSCAR TENANT PELO CUSTOMER ID (tenant já deve existir!)
    console.log(`[WEBHOOK] 🔍 Buscando tenant pelo customer ID: ${customerId}`);
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (tenantError) {
      console.error(`[WEBHOOK] ❌ Tenant não encontrado pelo customer ID. Tentando por metadados...`);
      
      if (!tenantId) {
        console.error(`[WEBHOOK] ❌ Nem customer ID nem tenant ID funcionaram. ERRO CRÍTICO!`);
        return false;
      }

      // Fallback: buscar por tenant_id dos metadados
      const { data: tenantByMetadata, error: tenantMetadataError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantMetadataError) {
        console.error(`[WEBHOOK] ❌ Tenant não encontrado nem por customer ID nem por metadados:`, tenantMetadataError);
        return false;
      }

      console.log(`[WEBHOOK] ✅ Tenant encontrado por metadados: ${tenantByMetadata.id}`);
      
      // Usar a função RPC para processar o pagamento
      const { data: result, error: rpcError } = await supabase.rpc('process_stripe_payment_event', {
        p_event_id: `checkout_${session.id}`,
        p_tenant_id: tenantByMetadata.id,
        p_stripe_customer_id: customerId,
        p_stripe_subscription_id: subscriptionId,
        p_stripe_product_id: productId,
        p_stripe_price_id: priceId,
        p_plan_tier: planTier
      });

      if (rpcError) {
        console.error(`[WEBHOOK] ❌ Erro na função RPC:`, rpcError);
        return false;
      }

      console.log(`[WEBHOOK] ✅ RPC executada com sucesso:`, result);
      return true;
    }

    console.log(`[WEBHOOK] ✅ Tenant encontrado: ${tenant.id}`);

    // 5. USAR FUNÇÃO RPC PARA PROCESSAR PAGAMENTO (MAIS SIMPLES E CONFIÁVEL)
    console.log(`[WEBHOOK] 🚀 Processando pagamento via RPC...`);
    const { data: result, error: rpcError } = await supabase.rpc('process_stripe_payment_event', {
      p_event_id: `checkout_${session.id}`,
      p_tenant_id: tenant.id,
      p_stripe_customer_id: customerId,
      p_stripe_subscription_id: subscriptionId,
      p_stripe_product_id: productId,
      p_stripe_price_id: priceId,
      p_plan_tier: planTier
    });

    if (rpcError) {
      console.error(`[WEBHOOK] ❌ Erro na função RPC:`, rpcError);
      return false;
    }

    console.log(`[WEBHOOK] 🎉 PAGAMENTO PROCESSADO COM SUCESSO!`);
    console.log(`[WEBHOOK] - Tenant: ${tenant.id}`);
    console.log(`[WEBHOOK] - Plano: ${planTier}`);
    console.log(`[WEBHOOK] - Customer: ${customerId}`);
    console.log(`[WEBHOOK] - Subscription: ${subscriptionId}`);
    
    return true;

  } catch (error) {
    console.error(`[WEBHOOK] ❌ ERRO CRÍTICO ao processar checkout:`, error);
    
    // Registrar falha no evento
    await supabase.rpc('mark_stripe_event_failed', {
      p_event_id: `checkout_${session.id}`,
      p_error_message: error?.toString() || 'Erro desconhecido'
    });
    
    return false;
  }
}

// Função simplificada para subscription updates
async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] 🔄 Processando subscription update: ${subscription.id}`);
  
  try {
    const customerId = subscription.customer as string;
    const productId = subscription.items.data[0]?.price.product as string;
    const planTier = getPlanFromProduct(productId);

    // Usar a nova função RPC para sincronização completa
    const { data: result, error: rpcError } = await supabase.rpc('sync_stripe_subscription_status', {
      p_stripe_customer_id: customerId,
      p_plan_tier: planTier,
      p_subscription_status: subscription.status,
      p_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      p_current_period_end: new Date(subscription.current_period_end * 1000).toISOString()
    });

    if (rpcError) {
      console.error(`[WEBHOOK] ❌ Erro na função RPC sync_stripe_subscription_status:`, rpcError);
      return false;
    }

    if (!result) {
      console.error(`[WEBHOOK] ❌ Tenant não encontrado para customer: ${customerId}`);
      return false;
    }

    console.log(`[WEBHOOK] ✅ Subscription update processada via RPC - plan_status e payment_status atualizados`);
    return true;

  } catch (error) {
    console.error(`[WEBHOOK] ❌ Erro ao processar subscription update:`, error);
    return false;
  }
}

// Função para cancelamento
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log(`[WEBHOOK] ❌ Processando subscription deleted: ${subscription.id}`);

  try {
    const { error: tenantError } = await supabase
      .from("tenants")
      .update({ 
        plan_status: "canceled",
        payment_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq("stripe_subscription_id", subscription.id);

    if (tenantError) {
      console.error(`[WEBHOOK] ❌ Erro ao cancelar tenant:`, tenantError);
      return false;
    }

    console.log(`[WEBHOOK] ✅ Subscription cancelada`);
    return true;

  } catch (error) {
    console.error(`[WEBHOOK] ❌ Erro ao processar cancelamento:`, error);
    return false;
  }
}

// Handler principal do webhook
async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const sign = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!sign || !STRIPE_WEBHOOK_SECRET) {
    console.error("[WEBHOOK] ❌ Assinatura do webhook ou segredo ausente");
    return new Response("Webhook secret not configured", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sign, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error(`[WEBHOOK] ❌ Erro na verificação da assinatura: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  console.log(`[WEBHOOK] 🎯 EVENTO RECEBIDO: ${event.type}`);

  let success = false;
  try {
    switch (event.type) {
      case 'checkout.session.completed':
        success = await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'invoice.payment_succeeded':
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        success = await handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        success = await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      default:
        console.log(`[WEBHOOK] ⏭️ Evento ignorado: ${event.type}`);
        success = true;
    }
  } catch (e: any) {
      console.error(`[WEBHOOK] ❌ ERRO CRÍTICO no handler do evento ${event.type}:`, e);
      return new Response(JSON.stringify({ error: `Internal server error: ${e.message}` }), { status: 500 });
  }

  if (success) {
    console.log(`[WEBHOOK] ✅ SUCESSO! Evento ${event.type} processado`);
    return new Response(JSON.stringify({ received: true, success: true }), { status: 200 });
  } else {
    console.error(`[WEBHOOK] ❌ FALHA ao processar evento ${event.type}`);
    return new Response(JSON.stringify({ received: true, success: false, event_type: event.type }), { status: 200 });
  }
}

// @ts-ignore
export default handler;