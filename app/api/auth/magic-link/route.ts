import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
});

// Deprecated — Pro auth uses Google OAuth via /login. Kept for backwards compatibility.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Placeholder — magic link email not actually sent (do not echo email — avoids leaking input in responses/logs parity issues)
  return NextResponse.json({
    ok: true,
    message: "Magic link sent (stub — not implemented yet)",
  });
}
