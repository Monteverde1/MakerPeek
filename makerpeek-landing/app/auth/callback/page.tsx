"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabase } from "@/lib/supabase";

function CallbackInner() {
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get("code");
      if (code) {
        await getSupabase().auth.exchangeCodeForSession(code);
      }

      const {
        data: { session },
      } = await getSupabase().auth.getSession();
      if (!session) return;

      const email = session.user.email!;
      const extId = searchParams.get("ext");

      const res = await fetch(`/api/pro-status?email=${encodeURIComponent(email)}`);
      const { isPro } = await res.json();

      const chromeApi = (window as unknown as { chrome?: { runtime?: { sendMessage: Function } } })
        .chrome;
      if (extId && chromeApi?.runtime) {
        try {
          chromeApi.runtime.sendMessage(extId, {
            type: "AUTH_SUCCESS",
            email,
            isPro,
          });
        } catch {
          /* extension not installed or unreachable */
        }
      }
    }
    void handleCallback();
  }, [searchParams]);

  return (
    <main
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#1A3728",
      }}
    >
      <p style={{ color: "#FAF5E6", fontFamily: "serif", fontSize: "1.2rem" }}>
        Signed in. You can close this tab.
      </p>
    </main>
  );
}

export default function Callback() {
  return (
    <Suspense>
      <CallbackInner />
    </Suspense>
  );
}
