// Deno Deploy (Supabase Edge Function)
// Creates a Stripe Billing Portal Session

// deno-lint-ignore-file no-explicit-any
import Stripe from "https://esm.sh/stripe@12.18.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2025-05-28.basil",
});

function getOrigin(req: Request): string {
  const url = new URL(req.url);
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || url.protocol.replace(":", "");
  const host = forwardedHost || url.host;
  return `${forwardedProto}://${host}`;
}

export async function handler(req: Request): Promise<Response> {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  try {
    const origin = getOrigin(req);
    const { customerId } = await req.json();
    if (!customerId) return Response.json({ error: "customerId é obrigatório" }, { status: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/admin`,
    });
    return Response.json({ url: session.url });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Erro interno" }, { status: 500 });
  }
}

// @ts-ignore
export default handler;


