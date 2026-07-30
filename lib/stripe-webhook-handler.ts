import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import {
  findUserIdByStripeCustomer,
  revokeProEntitlement,
  setProEntitlement,
} from "@/lib/profiles";

async function userIdFromCheckoutSession(session: Stripe.Checkout.Session) {
  const metaId = session.metadata?.supabase_user_id;
  if (metaId) return metaId;
  if (session.client_reference_id) return session.client_reference_id;
  return null;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = await userIdFromCheckoutSession(session);
  if (!userId) {
    console.error("[stripe webhook] checkout.session.completed: no user id");
    return;
  }

  const stripe = getStripe();
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id ?? null;

  let subscriptionId: string | null = null;
  let priceId: string | null = null;
  let status: string | null = "active";

  if (typeof session.subscription === "string") {
    subscriptionId = session.subscription;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    status = sub.status;
    priceId = sub.items.data[0]?.price?.id ?? null;
  }

  await setProEntitlement({
    userId,
    email: session.customer_details?.email ?? session.customer_email ?? null,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    stripePriceId: priceId,
    subscriptionStatus: status,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId =
    subscription.metadata?.supabase_user_id ??
    (typeof subscription.customer === "string"
      ? await findUserIdByStripeCustomer(subscription.customer)
      : null);

  if (!userId) {
    console.error("[stripe webhook] subscription.deleted: no user id");
    return;
  }
  await revokeProEntitlement(userId);
}

export async function handleStripeWebhook(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeSecretKey) {
    console.error("[stripe webhook] Missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
    return NextResponse.json({ error: "Webhook not configured." }, { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header." }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("[stripe webhook] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error("[stripe webhook] Handler error:", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
