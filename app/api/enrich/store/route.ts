import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  store_url: z.string().url(),
});

// TODO: perform store-level analysis:
//       - Detect POD supplier from product titles/tags/vendor strings
//       - Identify primary niche(s) using Claude (paid tier only)
//       - Calculate design velocity from created_at distribution
//       - Return aggregate store health / opportunity signal

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { store_url } = parsed.data;

  return NextResponse.json({
    store_url,
    supplier_detected: "Printful",
    primary_niche: "motivational gifts",
    secondary_niches: ["pet lover", "cottagecore"],
    total_products_analyzed: 3,
    estimated_design_velocity: { designs_per_week: 2.4 },
    store_age_days: 480,
    // TODO: real values derived from products analysis
  });
}
