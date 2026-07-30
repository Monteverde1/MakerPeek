import Stripe from "stripe";
import { NextResponse } from "next/server";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key);
}

export async function POST(req: Request) {
  const { priceId, email } = await req.json();
  const base = process.env.NEXT_PUBLIC_BASE_URL || "https://makerpeek.com";

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: email,
    success_url: `${base}/success`,
    cancel_url: `${base}/pricing`,
  });

  return NextResponse.json({ url: session.url });
}
