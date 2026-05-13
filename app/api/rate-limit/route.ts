import { NextRequest, NextResponse } from "next/server";
import type { RateLimitStatus } from "@/shared/types";

// TODO: identify caller by IP (headers['x-forwarded-for']) and extension fingerprint
//       (query param or header), look up usage count in Supabase for today,
//       return real RateLimitStatus. Free tier cap: 5 lookups/day.

export async function GET(_req: NextRequest) {
  const tomorrow = new Date();
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  const placeholder: RateLimitStatus = {
    used_today: 1,
    limit: 5,
    reset_at: tomorrow.toISOString(),
  };

  return NextResponse.json(placeholder);
}
