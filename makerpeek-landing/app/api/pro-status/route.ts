import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");
  if (!email) return NextResponse.json({ isPro: false });

  const { data } = await getSupabaseAdmin()
    .from("subscriptions")
    .select("status")
    .eq("email", email)
    .single();

  return NextResponse.json({ isPro: data?.status === "active" });
}
