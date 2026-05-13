import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  plan: z.enum(["monthly", "annual"]),
  email: z.string().email().optional(),
});

// TODO: create a Stripe Checkout session using the appropriate STRIPE_PRICE_ID_MONTHLY
//       or STRIPE_PRICE_ID_ANNUAL, pass success_url and cancel_url,
//       return the session URL for redirect.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Placeholder — no real Stripe session created
  return NextResponse.json({
    checkout_url: "https://checkout.stripe.com/stub",
    plan: parsed.data.plan,
    message: "Stripe checkout stub — not implemented yet",
  });
}
