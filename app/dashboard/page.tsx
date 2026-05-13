// TODO: Implement authenticated dashboard.
//       - Protect route with Supabase session check (redirect to / if unauthenticated)
//       - Show user plan (free/pro), remaining lookups today, recent lookup history
//       - Pro users: link to manage subscription via Stripe customer portal

export default function DashboardPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-2xl font-bold mb-2" style={{ color: "#3D5944" }}>
        Dashboard
      </h1>
      <p className="text-neutral-500 text-sm mb-8">
        [Stub — authentication and data not wired up yet]
      </p>

      <div className="rounded-xl border border-neutral-200 p-6 bg-white">
        <p className="font-medium text-neutral-700">Plan</p>
        <p className="text-3xl font-bold mt-1" style={{ color: "#3D5944" }}>
          Free
        </p>
        <p className="text-sm text-neutral-400 mt-1">3 of 5 lookups used today</p>
      </div>
    </main>
  );
}
