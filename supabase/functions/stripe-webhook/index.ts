// Deno Deploy (Supabase Edge Function)
// Stripe Webhook handler – updates subscription status in database

// deno-lint-ignore-file no-explicit-any
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY") || "";
const STRIPE_WEBHOOK_SECRET = Deno.env.get("SUBSCRIPTION_SECRET") || Deno.env.get("STRIPE_WEBHOOK_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-05-28.basil" });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapeamento de produtos para planos
const PRODUCT_TO_PLAN_MAP: Record<string, string> = {
  "prod_SqqVGzUIvJPVpt": "essential",
  "prod_professional": "professional", 
  "prod_premium": "premium"
};

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const sign = req.headers.get("stripe-signature");
  const rawBody = await req.text();
  if (!sign || !STRIPE_WEBHOOK_SECRET) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sign, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const productId = (session.metadata?.product_id as string) || undefined;
        const planTier = PRODUCT_TO_PLAN_MAP[productId || ""] || "essential";

        console.log(`[WEBHOOK] Checkout completed for customer ${customerId}, plan: ${planTier}`);

        // Buscar o customer para obter o email
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = customer.email;

        if (!customerEmail) {
          console.error("[WEBHOOK] No email found for customer", customerId);
          break;
        }

        console.log(`[WEBHOOK] Customer email: ${customerEmail}`);

        // Buscar usuário pelo email
        const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
        
        if (userError) {
          console.error("[WEBHOOK] Error listing users:", userError);
          break;
        }
        
        const user = userData.users.find(u => u.email === customerEmail);
        console.log(`[WEBHOOK] User found:`, user ? user.id : 'No user found');

        if (user) {
          // Usuário já existe, associar pagamento ao tenant
          console.log(`[WEBHOOK] Associating payment to existing user ${user.id}`);
          
          try {
            const { error: associateError } = await supabase.rpc('associate_payment_to_tenant', {
              p_user_id: user.id,
              p_plan_tier: planTier,
              p_stripe_customer_id: customerId,
              p_stripe_subscription_id: session.subscription as string
            });
            
            if (associateError) {
              console.error("[WEBHOOK] Error associating payment:", associateError);
              // Fallback: try direct update if RPC fails
              const { error: fallbackError } = await supabase.from("tenants").update({
                plan: planTier,
                plan_tier: planTier,
                plan_status: "active",
                stripe_customer_id: customerId,
                stripe_subscription_id: session.subscription as string,
                payment_completed: true,
                updated_at: new Date().toISOString(),
              } as any).eq("owner_id", user.id);
              
              if (fallbackError) {
                console.error("[WEBHOOK] Fallback update also failed:", fallbackError);
              } else {
                console.log(`[WEBHOOK] Fallback update successful for user ${user.id}`);
              }
            } else {
              console.log(`[WEBHOOK] Successfully associated payment to user ${user.id}`);
            }
          } catch (error) {
            console.error("[WEBHOOK] Exception in payment association:", error);
          }
        } else {
          // Usuário não existe ainda, salvar informações para associação posterior
          console.log(`[WEBHOOK] User not found, saving payment info for future association`);
          const { error: upsertError } = await supabase.from("subscribers").upsert({
            email: customerEmail,
            stripe_customer_id: customerId,
            stripe_subscription_id: session.subscription as string,
            subscribed: true,
            subscription_tier: planTier,
            updated_at: new Date().toISOString(),
          });
          
          if (upsertError) {
            console.error("[WEBHOOK] Error upserting subscriber:", upsertError);
          } else {
            console.log(`[WEBHOOK] Successfully saved payment info for future user association`);
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        
        console.log(`[WEBHOOK] Payment succeeded for customer ${customerId}`);
        
        // Marcar tenant como ativo
        await supabase.from("tenants").update({ 
          plan_status: "active",
          payment_completed: true,
          updated_at: new Date().toISOString()
        } as any).eq("stripe_customer_id", customerId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const productId = (sub.items.data[0]?.price.product as string) || undefined;
        const planTier = PRODUCT_TO_PLAN_MAP[productId || ""] || "essential";
        
        console.log(`[WEBHOOK] Subscription ${event.type} for customer ${customerId}, plan: ${planTier}`);

        // Buscar o customer para obter o email
        const customer = await stripe.customers.retrieve(customerId);
        const customerEmail = customer.email;

        if (customerEmail) {
          console.log(`[WEBHOOK] Customer email: ${customerEmail}`);
          
          // Buscar usuário pelo email
          const { data: userData, error: userError } = await supabase.auth.admin.listUsers();
          
          if (userError) {
            console.error("[WEBHOOK] Error listing users:", userError);
            break;
          }
          
          const user = userData.users.find(u => u.email === customerEmail);
          console.log(`[WEBHOOK] User found:`, user ? user.id : 'No user found');

          if (user) {
            console.log(`[WEBHOOK] Updating tenant for user ${user.id}`);
            
            // Atualizar tenant com informações da subscription
            const { error: tenantError } = await supabase.from("tenants").update({
              plan_status: sub.status,
              plan: planTier,
              plan_tier: planTier,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub.id,
              current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
              current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
              payment_completed: true,
              updated_at: new Date().toISOString(),
            } as any).eq("owner_id", user.id);

            if (tenantError) {
              console.error("[WEBHOOK] Error updating tenant:", tenantError);
            } else {
              console.log(`[WEBHOOK] Successfully updated tenant for user ${user.id}`);
            }

            // Atualizar subscribers
            const { error: subscriberError } = await supabase.from("subscribers").upsert({
              user_id: user.id,
              email: customerEmail,
              stripe_customer_id: customerId,
              stripe_subscription_id: sub.id,
              subscribed: sub.status === "active",
              subscription_tier: planTier,
              subscription_end: new Date(sub.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            });
            
            if (subscriberError) {
              console.error("[WEBHOOK] Error updating subscriber:", subscriberError);
            } else {
              console.log(`[WEBHOOK] Successfully updated subscriber for user ${user.id}`);
            }
          } else {
            console.log(`[WEBHOOK] User not found for email ${customerEmail}, payment will be associated later`);
          }
        } else {
          console.error("[WEBHOOK] No email found for customer", customerId);
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        
        console.log(`[WEBHOOK] Subscription deleted: ${sub.id}`);
        
        await supabase.from("tenants").update({ 
          plan_status: "canceled",
          payment_completed: false,
          updated_at: new Date().toISOString()
        } as any).eq("stripe_subscription_id", sub.id);
        
        await supabase.from("subscribers").update({
          subscribed: false,
          subscription_end: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("stripe_subscription_id", sub.id);
        break;
      }
      default:
        // ignore
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e: any) {
    console.error("[WEBHOOK] Error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// @ts-ignore
export default handler;


