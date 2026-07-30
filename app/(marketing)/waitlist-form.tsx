"use client";

import { useState } from "react";

type Status = "idle" | "loading" | "success" | "duplicate" | "error";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || status === "loading") return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data?.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }

      setStatus(data.alreadySignedUp ? "duplicate" : "success");
    } catch {
      setErrorMsg("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="mt-10 max-w-md mx-auto text-center">
        <p className="text-forest font-semibold text-base">
          You&rsquo;re on the list.
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          We&rsquo;ll email you at launch with your 20% discount code. No other emails.
        </p>
      </div>
    );
  }

  if (status === "duplicate") {
    return (
      <div className="mt-10 max-w-md mx-auto text-center">
        <p className="text-ink font-semibold text-base">Already signed up.</p>
        <p className="mt-1 text-sm text-ink-soft">
          That email is already on the waitlist. We&rsquo;ll be in touch at launch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-10 max-w-md mx-auto">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={status === "loading"}
          className="flex-1 px-4 py-3 rounded-lg border border-beige bg-white text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="px-6 py-3 rounded-lg bg-forest text-white font-medium hover:bg-forest-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {status === "loading" ? "Saving…" : "Join waitlist"}
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        One email at launch. Waitlist gets{" "}
        <span className="font-medium text-ink">20% off the first year.</span> No spam.
      </p>
      {status === "error" && (
        <p className="mt-3 text-sm text-red-600">{errorMsg}</p>
      )}
    </form>
  );
}
