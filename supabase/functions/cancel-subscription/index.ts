import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2024-04-10",
});

// @ts-ignore
const supabase = createClient(
  // @ts-ignore
  Deno.env.get("SUPABASE_URL") || "",
  // @ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscriptionId, tenantId } = await req.json();

    if (!subscriptionId || !tenantId) {
      throw new Error("subscriptionId and tenantId are required");
    }

    console.log(`[CANCEL-SUBSCRIPTION] Canceling subscription: ${subscriptionId} for tenant: ${tenantId}`);

    // Cancelar assinatura no Stripe
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
    
    console.log(`[CANCEL-SUBSCRIPTION] Stripe subscription canceled:`, canceledSubscription.id);

    // Atualizar dados no Supabase
    const { error: tenantError } = await supabase
      .from('tenants')
      .update({
        plan_status: 'canceled',
        payment_completed: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', tenantId);

    if (tenantError) {
      console.error(`[CANCEL-SUBSCRIPTION] Error updating tenant:`, tenantError);
      throw tenantError;
    }

    // Atualizar subscriber
    const { error: subscriberError } = await supabase
      .from('subscribers')
      .update({
        subscribed: false,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (subscriberError) {
      console.error(`[CANCEL-SUBSCRIPTION] Error updating subscriber:`, subscriberError);
    }

    // Atualizar subscription
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .update({
        status: 'canceled',
        updated_at: new Date().toISOString()
      })
      .eq('stripe_subscription_id', subscriptionId);

    if (subscriptionError) {
      console.error(`[CANCEL-SUBSCRIPTION] Error updating subscription:`, subscriptionError);
    }

    console.log(`[CANCEL-SUBSCRIPTION] Successfully canceled subscription and updated database`);

    return new Response(
      JSON.stringify({ success: true, subscription: canceledSubscription }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error(`[CANCEL-SUBSCRIPTION] Error:`, error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
