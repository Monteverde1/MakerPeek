import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const bodySchema = z.object({
  email: z.string().email(),
});

function isMakerPeekMarketingOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    const host = new URL(origin).hostname;
    return host === "makerpeek.com" || host === "www.makerpeek.com";
  } catch {
    return false;
  }
}

/**
 * Optional hardening: set WAITLIST_ALLOWED_ORIGINS=comma,separated,exact Origins
 * (e.g. https://makerpeek.vercel.app).
 * apex + www makerpeek.com are always allowed so landing ↔ API works even if env omits one host.
 * When unset entirely, sends Access-Control-Allow-Origin: *.
 */
function waitlistCorsHeaders(req: NextRequest): Record<string, string> | null {
  const raw = process.env.WAITLIST_ALLOWED_ORIGINS?.trim();
  const base: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (!raw) {
    return { ...base, "Access-Control-Allow-Origin": "*" };
  }

  const allowed = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const origin = req.headers.get("origin");

  if (
    origin &&
    (allowed.includes(origin) || isMakerPeekMarketingOrigin(origin))
  ) {
    return {
      ...base,
      "Access-Control-Allow-Origin": origin,
      Vary: "Origin",
    };
  }

  if (!origin) {
    return base;
  }

  return null;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase env vars not configured.");
  }
  return createClient(url, key);
}

export async function OPTIONS(req: NextRequest) {
  const cors = waitlistCorsHeaders(req);
  if (!cors) {
    return new NextResponse(null, { status: 403 });
  }
  return new NextResponse(null, { status: 204, headers: cors });
}

export async function POST(req: NextRequest) {
  const cors = waitlistCorsHeaders(req);
  if (!cors) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid email address is required." },
      { status: 400, headers: cors }
    );
  }

  const { email } = parsed.data;

  let supabase;
  try {
    supabase = getServiceClient();
  } catch {
    return NextResponse.json(
      { error: "Service unavailable. Please try again later." },
      { status: 503, headers: cors }
    );
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({ email });

  if (error) {
    // Unique constraint violation — already signed up
    if (error.code === "23505") {
      return NextResponse.json(
        { ok: true, alreadySignedUp: true },
        { headers: cors }
      );
    }
    console.error("[waitlist] Supabase insert error:", error);
    return NextResponse.json(
      { error: "Could not save your email. Please try again." },
      { status: 500, headers: cors }
    );
  }

  return NextResponse.json(
    { ok: true, alreadySignedUp: false },
    { headers: cors }
  );
}
