"use client";

import { getSupabase } from "@/lib/supabase";

export default function SignIn() {
  async function signInWithGoogle() {
    const params = new URLSearchParams(window.location.search);
    const extId = params.get("ext");
    const base = process.env.NEXT_PUBLIC_BASE_URL || window.location.origin;

    await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${base}/auth/callback${extId ? `?ext=${extId}` : ""}`,
      },
    });
  }

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#1A3728",
      }}
    >
      <h1
        style={{
          color: "#FAF5E6",
          fontFamily: "serif",
          fontSize: "2rem",
          marginBottom: "2rem",
        }}
      >
        MakerPeek
      </h1>
      <button
        type="button"
        onClick={signInWithGoogle}
        style={{
          padding: "12px 24px",
          background: "#FAF5E6",
          border: "none",
          borderRadius: "6px",
          fontSize: "1rem",
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Sign in with Google
      </button>
    </main>
  );
}
