import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getProfileByUserId } from "@/lib/profiles";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ paid: false, plan: "free", authenticated: false });
  }

  await ensureProfile(user.id, user.email ?? null);
  const profile = await getProfileByUserId(user.id);
  const plan = profile?.plan === "pro" ? "pro" : "free";

  return NextResponse.json({
    paid: plan === "pro",
    plan,
    authenticated: true,
    email: user.email ?? profile?.email ?? null,
    subscription_status: profile?.subscription_status ?? null,
  });
}
