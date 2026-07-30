import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ExtensionSyncClient from "./sync-client";

export default async function ExtensionSyncPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/extension/sync");
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-20 text-center">
      <h1 className="font-serif text-2xl font-semibold mb-3" style={{ color: "#3D5944" }}>
        Connect extension
      </h1>
      <p className="text-neutral-500 text-sm mb-8">
        Push your Pro status to the MakerPeek Chrome extension on this browser.
      </p>
      <ExtensionSyncClient />
    </main>
  );
}
