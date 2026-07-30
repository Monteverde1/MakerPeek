"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserPlan } from "@/shared/types";

type Props = {
  email: string;
  plan: UserPlan;
  subscriptionStatus: string | null;
};

export default function DashboardClient({ email, plan, subscriptionStatus }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [busy, setBusy] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(billing: "monthly" | "annual") {
    setBusy(billing);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: billing }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Checkout failed.");
        return;
      }
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(null);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const isPro = plan === "pro";

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-neutral-200 p-6 bg-white">
        <p className="text-sm text-neutral-500">Signed in as</p>
        <p className="font-medium text-neutral-800 mt-1">{email}</p>
        <p className="font-medium text-neutral-700 mt-6">Plan</p>
        <p className="text-3xl font-bold mt-1" style={{ color: "#3D5944" }}>
          {isPro ? "Pro" : "Free"}
        </p>
        {subscriptionStatus && (
          <p className="text-sm text-neutral-400 mt-1">Subscription: {subscriptionStatus}</p>
        )}
      </div>

      {isPro ? (
        <div className="rounded-xl border border-neutral-200 p-6 bg-white space-y-4">
          <p className="text-sm text-neutral-600">
            Connect the Chrome extension to unlock Pro on this browser.
          </p>
          <a
            href="/extension/sync"
            className="inline-block rounded-lg px-5 py-2.5 text-sm font-medium text-white"
            style={{ backgroundColor: "#3D5944" }}
          >
            Sync extension
          </a>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-neutral-200 p-6 bg-white">
            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Monthly</p>
            <p className="font-serif text-4xl font-semibold mt-2">$11</p>
            <p className="text-sm text-neutral-400">/ month</p>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => startCheckout("monthly")}
              className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#3D5944" }}
            >
              {busy === "monthly" ? "Redirecting…" : "Get Pro — Monthly"}
            </button>
          </div>
          <div className="rounded-xl border border-neutral-200 p-6 bg-white">
            <p className="text-sm font-medium text-neutral-500 uppercase tracking-wide">Annual</p>
            <p className="font-serif text-4xl font-semibold mt-2">$99</p>
            <p className="text-sm text-neutral-400">/ year · save $33</p>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => startCheckout("annual")}
              className="mt-5 w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#3D5944" }}
            >
              {busy === "annual" ? "Redirecting…" : "Get Pro — Annual"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={signOut}
        className="text-sm text-neutral-500 underline hover:text-neutral-700"
      >
        Sign out
      </button>
    </div>
  );
}
