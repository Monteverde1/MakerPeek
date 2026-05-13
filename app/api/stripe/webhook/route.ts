import { NextRequest, NextResponse } from "next/server";

// TODO: verify Stripe webhook signature using STRIPE_WEBHOOK_SECRET,
//       handle events: checkout.session.completed → upgrade user to pro,
//       customer.subscription.deleted → downgrade user to free,
//       invoice.payment_failed → notify user.

export async function POST(req: NextRequest) {
  // Raw body needed for signature verification — do not parse as JSON here
  const _rawBody = await req.text();

  // Placeholder — events not processed
  return NextResponse.json({ received: true });
}
