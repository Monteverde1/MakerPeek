"use client";

import { useEffect, useState } from "react";

type ChromeExternal = {
  runtime?: {
    sendMessage: (
      extensionId: string,
      message: unknown,
      callback?: (response: unknown) => void
    ) => void;
    lastError?: { message?: string };
  };
};

export default function ExtensionSyncClient() {
  const [status, setStatus] = useState<"idle" | "syncing" | "ok" | "error">("idle");
  const [detail, setDetail] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      setDetail("Payment received. Sync below to activate Pro in the extension.");
    }
  }, []);

  async function syncExtension() {
    setStatus("syncing");
    setDetail("");

    try {
      const res = await fetch("/api/entitlement");
      const entitlement = await res.json();
      if (!entitlement.authenticated) {
        setStatus("error");
        setDetail("Not signed in.");
        return;
      }

      const extId = new URLSearchParams(window.location.search).get("ext");
      const chromeApi = (window as unknown as { chrome?: ChromeExternal }).chrome;
      if (!extId || !chromeApi?.runtime?.sendMessage) {
        setStatus("error");
        setDetail(
          "Open this page from the extension popup (Sign in → Sync), or add ?ext=YOUR_EXTENSION_ID to the URL."
        );
        return;
      }

      chromeApi.runtime.sendMessage(
        extId,
        {
          type: "SET_PRO_STATUS",
          paid: !!entitlement.paid,
          plan: entitlement.plan,
          email: entitlement.email,
        },
        (response) => {
          if (chromeApi.runtime?.lastError) {
            setStatus("error");
            setDetail(chromeApi.runtime.lastError.message || "Could not reach extension.");
            return;
          }
          const ok = response && typeof response === "object" && "ok" in response && response.ok;
          if (ok) {
            setStatus("ok");
            setDetail(entitlement.paid ? "Pro is active in the extension." : "Free tier synced.");
          } else {
            setStatus("error");
            setDetail("Extension did not confirm sync.");
          }
        }
      );
    } catch {
      setStatus("error");
      setDetail("Network error.");
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={syncExtension}
        disabled={status === "syncing"}
        className="rounded-lg px-6 py-3 text-sm font-medium text-white disabled:opacity-60"
        style={{ backgroundColor: "#3D5944" }}
      >
        {status === "syncing" ? "Syncing…" : "Sync Pro to extension"}
      </button>
      {detail && (
        <p
          className={`text-sm mt-4 ${status === "ok" ? "text-green-800" : status === "error" ? "text-red-700" : "text-neutral-500"}`}
        >
          {detail}
        </p>
      )}
      <p className="text-xs text-neutral-400 mt-8">
        <a href="/dashboard" className="underline">
          Back to dashboard
        </a>
      </p>
    </div>
  );
}
