"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithGoogle() {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "/dashboard";
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-20 text-center">
      <h1 className="font-serif text-3xl font-semibold mb-3" style={{ color: "#3D5944" }}>
        Sign in to MakerPeek
      </h1>
      <p className="text-neutral-500 text-sm mb-8">
        Pro requires a Google account so your watchlist syncs across devices.
      </p>
      {error && (
        <p className="text-sm text-red-700 mb-4" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={signInWithGoogle}
        disabled={loading}
        className="w-full rounded-lg px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#3D5944" }}
      >
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      <p className="text-xs text-neutral-400 mt-6">
        <a href="/" className="underline hover:text-neutral-600">
          Back to home
        </a>
      </p>
    </main>
  );
}
