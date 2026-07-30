import { NextRequest } from "next/server";
import { handleStripeWebhook } from "@/lib/stripe-webhook-handler";

/** Alias for Stripe Dashboard URL https://makerpeek.com/api/webhook */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  return handleStripeWebhook(req);
}
