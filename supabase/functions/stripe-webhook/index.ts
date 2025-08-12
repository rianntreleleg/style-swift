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
        const planTier = (session.metadata?.plan_tier as string) || undefined;

        // Upsert tenant-less subscription row (associate later when tenant created)
        await supabase.from("subscriptions").insert({
          stripe_customer_id: customerId,
          stripe_subscription_id: session.subscription as string,
          stripe_product_id: productId,
          plan_tier: planTier,
          status: "active",
        } as any);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        // Mark active
        await supabase.from("tenants").update({ plan_status: "active" } as any).eq("stripe_customer_id", customerId);
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const productId = (sub.items.data[0]?.price.product as string) || undefined;
        const tierMap: Record<string, string> = {
          "prod_SqqVGzUIvJPVpt": "essential",
        };
        const plan_tier = tierMap[productId || ""] || null;
        await supabase.from("tenants").update({
          plan_status: sub.status,
          plan_tier,
          stripe_customer_id: customerId,
          stripe_subscription_id: sub.id,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        } as any).eq("stripe_customer_id", customerId);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await supabase.from("tenants").update({ plan_status: "canceled" } as any).eq("stripe_subscription_id", sub.id);
        break;
      }
      default:
        // ignore
        break;
    }
    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}

// @ts-ignore
export default handler;


