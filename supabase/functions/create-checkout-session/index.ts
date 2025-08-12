import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    const { productId } = await req.json();
    if (!productId) {
      throw new Error("productId is required");
    }
    logStep("Product ID received", { productId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Mapear produtos para preços
    const productPricing = {
      'prod_SqqVGzUIvJPVpt': { amount: 2990, currency: "brl", name: "Essencial" }, // R$ 29,90
      'prod_professional': { amount: 4390, currency: "brl", name: "Profissional" }, // R$ 43,90
      'prod_premium': { amount: 7990, currency: "brl", name: "Premium" } // R$ 79,90
    };

    const pricing = productPricing[productId as keyof typeof productPricing];
    if (!pricing) {
      throw new Error(`Invalid product ID: ${productId}`);
    }
    logStep("Pricing determined", pricing);

    const origin = req.headers.get("origin") || "http://localhost:8080";

    // Criar sessão de checkout
    const session = await stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: pricing.currency,
            product_data: {
              name: `StyleSwift - ${pricing.name}`,
              description: `Plano ${pricing.name} - Gestão completa para barbearias e salões`,
            },
            unit_amount: pricing.amount,
            recurring: { interval: "month" },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/auth?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?checkout=cancel`,
      allow_promotion_codes: true,
      metadata: {
        productId: productId,
        planName: pricing.name,
      },
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    return new Response(JSON.stringify({ url: session.url }), {
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


