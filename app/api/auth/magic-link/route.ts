import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  email: z.string().email(),
});

// TODO: use Supabase Auth signInWithOtp({ email }) to send a magic link.
//       Return 200 on success; Supabase handles the email delivery.

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Placeholder — magic link email not actually sent
  return NextResponse.json({
    message: "Magic link sent (stub — not implemented yet)",
    email: parsed.data.email,
  });
}
