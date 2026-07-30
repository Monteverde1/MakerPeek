import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { appUrl, getStripe } from "@/lib/stripe";
import { ensureProfile } from "@/lib/profiles";

const bodySchema = z.object({
  plan: z.enum(["monthly", "annual"]),
});

// PRICING: $11/mo or $99/yr (save $33 = 25% off)

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const priceId =
    parsed.data.plan === "monthly"
      ? process.env.STRIPE_PRICE_ID_MONTHLY
      : process.env.STRIPE_PRICE_ID_ANNUAL;

  if (!priceId) {
    return NextResponse.json({ error: "Stripe prices not configured." }, { status: 503 });
  }

  await ensureProfile(user.id, user.email ?? null);

  const base = appUrl();
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email ?? undefined,
    client_reference_id: user.id,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${base}/extension/sync?checkout=success`,
    cancel_url: `${base}/dashboard?checkout=canceled`,
    metadata: {
      supabase_user_id: user.id,
      plan: parsed.data.plan,
    },
    subscription_data: {
      metadata: {
        supabase_user_id: user.id,
        plan: parsed.data.plan,
      },
    },
  });

  if (!session.url) {
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }

  return NextResponse.json({ checkout_url: session.url, plan: parsed.data.plan });
}
