import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CUSTOMER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }
    logStep("Stripe key verified");

    const { email, name, metadata } = await req.json();
    if (!email) {
      throw new Error("email is required");
    }
    logStep("Request data received", { email, name, metadata });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Criar customer no Stripe
    const customer = await stripe.customers.create({
      email: email,
      name: name || `Cliente ${email.split('@')[0]}`,
      metadata: metadata || {},
    });

    logStep("Customer created in Stripe", { 
      customerId: customer.id, 
      email: customer.email 
    });

    return new Response(JSON.stringify({ 
      customer_id: customer.id,
      email: customer.email,
      created: customer.created
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
