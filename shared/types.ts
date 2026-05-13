// Shared TypeScript types used by both the Next.js backend and Chrome extension

export interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  sku: string | null;
  available: boolean;
}

export interface ShopifyProduct {
  id: number;
  title: string;
  handle: string;
  vendor: string;
  product_type: string;
  tags: string[];
  variants: ShopifyVariant[];
  images: Array<{ id: number; src: string; alt: string | null }>;
  created_at: string;
  updated_at: string;
  available: boolean;
}

export interface EnrichedProduct extends ShopifyProduct {
  /** 0–100 relative popularity score based on listing signals */
  estimated_sales_score: number;
  /** The base product category (e.g. "Unisex Tee", "Canvas Print") */
  base_product_type: string;
  /** Tags extracted by theme analysis */
  theme_tags: string[];
  /** Rough margin in USD after estimated base cost */
  estimated_margin_usd: number;
}

export type SupplierDetected =
  | "Printful"
  | "Printify"
  | "Gelato"
  | "CustomCat"
  | "Unknown";

export interface EnrichmentResponse {
  store_url: string;
  total_products: number;
  supplier_detected: SupplierDetected;
  top_themes: string[];
  estimated_design_velocity: {
    designs_per_week: number;
  };
  products: EnrichedProduct[];
}

export type UserPlan = "free" | "pro";

export interface RateLimitStatus {
  used_today: number;
  limit: number;
  /** ISO 8601 datetime string for when the counter resets */
  reset_at: string;
}
