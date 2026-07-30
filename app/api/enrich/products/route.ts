import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { EnrichmentResponse } from "@/shared/types";
import {
  parsePublicHttpsStoreUrl,
  UnsafeStoreUrlError,
} from "@/lib/public-store-url";

const bodySchema = z.object({
  store_url: z.string().url(),
});

// TODO: fetch `${store_url}/products.json?limit=250`, parse raw Shopify products,
//       run supplier detection, theme extraction, sales score estimation, and margin calculation.
//       sales score estimation, and margin calculation.

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

  try {
    parsePublicHttpsStoreUrl(store_url);
  } catch (e) {
    if (e instanceof UnsafeStoreUrlError) {
      return NextResponse.json(
        { error: "Invalid store URL — must be a public https storefront URL." },
        { status: 400 }
      );
    }
    throw e;
  }

  const placeholder: EnrichmentResponse = {
    store_url,
    total_products: 3,
    supplier_detected: "Printful",
    top_themes: ["motivational", "pet lover", "cottagecore"],
    estimated_design_velocity: { designs_per_week: 2.4 },
    products: [
      {
        id: 1001,
        title: "Placeholder Tee — Motivational Quote",
        handle: "placeholder-tee-motivational-quote",
        vendor: store_url,
        product_type: "T-Shirt",
        tags: ["motivational", "tee", "unisex"],
        variants: [
          { id: 2001, title: "S / Black", price: "24.99", sku: "TEE-BLK-S", available: true },
          { id: 2002, title: "M / Black", price: "24.99", sku: "TEE-BLK-M", available: true },
        ],
        images: [{ id: 3001, src: "https://via.placeholder.com/400", alt: null }],
        created_at: "2024-01-15T00:00:00Z",
        updated_at: "2024-03-10T00:00:00Z",
        available: true,
        estimated_sales_score: 82,
        base_product_type: "Unisex Tee",
        theme_tags: ["motivational", "typography"],
        estimated_margin_usd: 11.5,
      },
      {
        id: 1002,
        title: "Placeholder Mug — Dog Mom",
        handle: "placeholder-mug-dog-mom",
        vendor: store_url,
        product_type: "Mug",
        tags: ["dog", "pet lover", "mug"],
        variants: [
          { id: 2003, title: "11oz", price: "18.99", sku: "MUG-11OZ", available: true },
          { id: 2004, title: "15oz", price: "21.99", sku: "MUG-15OZ", available: false },
        ],
        images: [{ id: 3002, src: "https://via.placeholder.com/400", alt: null }],
        created_at: "2024-02-01T00:00:00Z",
        updated_at: "2024-04-05T00:00:00Z",
        available: true,
        estimated_sales_score: 67,
        base_product_type: "Ceramic Mug",
        theme_tags: ["pet lover", "dog mom"],
        estimated_margin_usd: 8.2,
      },
      {
        id: 1003,
        title: "Placeholder Canvas — Cottagecore Botanicals",
        handle: "placeholder-canvas-cottagecore-botanicals",
        vendor: store_url,
        product_type: "Wall Art",
        tags: ["cottagecore", "botanical", "canvas"],
        variants: [
          { id: 2005, title: '12"x16"', price: "39.99", sku: "CANVAS-1216", available: true },
        ],
        images: [{ id: 3003, src: "https://via.placeholder.com/400", alt: null }],
        created_at: "2024-03-20T00:00:00Z",
        updated_at: "2024-05-01T00:00:00Z",
        available: true,
        estimated_sales_score: 54,
        base_product_type: "Canvas Print",
        theme_tags: ["cottagecore", "botanical", "home decor"],
        estimated_margin_usd: 16.0,
      },
    ],
  };

  return NextResponse.json(placeholder);
}
