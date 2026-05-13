"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [submitted, setSubmitted] = useState(false);
  const [email, setEmail] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    const subject = encodeURIComponent("MakerPeek waitlist signup");
    const body = encodeURIComponent(`Add me to the waitlist:\n\n${email}`);
    window.location.href = `mailto:hello@makerpeek.com?subject=${subject}&body=${body}`;
    setSubmitted(true);
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
          className="flex-1 px-4 py-3 rounded-lg border border-beige bg-white text-ink placeholder:text-ink-soft/60 focus:outline-none focus:ring-2 focus:ring-forest/40 focus:border-forest"
        />
        <button
          type="submit"
          className="px-6 py-3 rounded-lg bg-forest text-white font-medium hover:bg-forest-dark transition-colors"
        >
          Join waitlist
        </button>
      </div>
      <p className="mt-3 text-xs text-ink-soft">
        One email at launch. Waitlist gets{" "}
        <span className="font-medium text-ink">20% off the first year.</span> No spam.
      </p>
      {submitted && (
        <p className="mt-3 text-sm text-forest font-medium">
          Your email app should open. Hit send to lock in your spot.
        </p>
      )}
    </form>
  );
}
