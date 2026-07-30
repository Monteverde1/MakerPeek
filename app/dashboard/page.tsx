import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ensureProfile, getProfileByUserId } from "@/lib/profiles";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  await ensureProfile(user.id, user.email ?? null);
  const profile = await getProfileByUserId(user.id);
  const plan = profile?.plan === "pro" ? "pro" : "free";

  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#3D5944" }}>
        Dashboard
      </h1>
      <p className="text-neutral-500 text-sm mb-8">
        Manage your MakerPeek account and Pro subscription.
      </p>
      <DashboardClient
        email={user.email ?? profile?.email ?? ""}
        plan={plan}
        subscriptionStatus={profile?.subscription_status ?? null}
      />
    </main>
  );
}
