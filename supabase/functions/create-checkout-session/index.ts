// Deno Deploy (Supabase Edge Function)
// Creates a Stripe Checkout Session for subscription plans

// deno-lint-ignore-file no-explicit-any
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-05-28.basil",
});

export async function handler(req: Request): Promise<Response> {
  console.log("Function iniciada");
  
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    console.log("Parsing body...");
    const body = await req.json().catch(() => ({} as any));
    console.log("Body:", body);
    
    const { productId } = body as { productId?: string };
    if (!productId) {
      return Response.json({ error: "productId é obrigatório" }, { status: 400 });
    }

    console.log("ProductId:", productId);
    console.log("Stripe key:", Deno.env.get("STRIPE_SECRET_KEY") ? "Presente" : "Ausente");

    // Teste simples - retornar URL de teste
    return Response.json({ 
      url: "https://checkout.stripe.com/test",
      message: "Function funcionando",
      productId: productId
    });
    
  } catch (e: any) {
    console.error("Erro na function:", e);
    return Response.json({ error: e?.message || "Erro interno" }, { status: 500 });
  }
}

// @ts-ignore - Supabase Edge expects default export
export default handler;


