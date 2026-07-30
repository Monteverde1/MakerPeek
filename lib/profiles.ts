import type { UserPlan } from "@/shared/types";
import { createServiceClient } from "@/lib/supabase";

export type ProfileRow = {
  id: string;
  email: string | null;
  plan: UserPlan;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  subscription_status: string | null;
};

export async function getProfileByUserId(userId: string): Promise<ProfileRow | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, email, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return data as ProfileRow | null;
}

export async function ensureProfile(userId: string, email: string | null) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("profiles").upsert(
    { id: userId, email, plan: "free", updated_at: new Date().toISOString() },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function setProEntitlement(args: {
  userId: string;
  email?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  subscriptionStatus?: string | null;
}) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("profiles").upsert(
    {
      id: args.userId,
      email: args.email ?? undefined,
      plan: "pro",
      stripe_customer_id: args.stripeCustomerId ?? null,
      stripe_subscription_id: args.stripeSubscriptionId ?? null,
      stripe_price_id: args.stripePriceId ?? null,
      subscription_status: args.subscriptionStatus ?? "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
  if (error) throw error;
}

export async function revokeProEntitlement(userId: string) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      plan: "free",
      subscription_status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function findUserIdByStripeCustomer(
  customerId: string
): Promise<string | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}
