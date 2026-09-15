/**
 * Server-side Shopify storefront detection.
 *
 * Mirrors what the extension does in the page, but from the outside: fetch the
 * public storefront HTML once and read what the store itself publishes. No
 * private endpoints, no modelled numbers, nothing cached server-side.
 */

import {
  APP_SIGNATURES,
  DOM_APP_MARKER_RULES,
  type Confidence,
} from "./shopify-signatures";

export type DetectedApp = {
  name: string;
  category: string;
  confidence: Confidence;
  evidence: string;
};

export type DetectResult =
  | { ok: true; host: string; isShopify: boolean; apps: DetectedApp[]; theme: string | null; themeSource: string | null }
  | { ok: false; host: string | null; error: string };

const CONF_RANK: Record<Confidence, number> = { confirmed: 3, likely: 2, possible: 1 };
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 2_000_000;

/** Accepts "example.com", "www.example.com/collections/all", "https://example.com" */
export function normalizeStoreInput(raw: string): string | null {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  // Reject anything that isn't a plausible public host.
  if (!host.includes(".")) return null;
  if (host === "localhost" || /^\d+\.\d+\.\d+\.\d+$/.test(host)) return null;
  if (host.endsWith(".local") || host.endsWith(".internal")) return null;
  return host;
}

function looksLikeShopify(html: string): boolean {
  return (
    /cdn\.shopify\.com/i.test(html) ||
    /Shopify\.theme/i.test(html) ||
    /ShopifyAnalytics/i.test(html) ||
    /\/cdn\/shop\//i.test(html)
  );
}

/** Same inline-JSON parse the extension falls back to when Shopify.theme is absent. */
function extractTheme(html: string): { name: string; source: string } | null {
  const candidates: Array<[RegExp, string]> = [
    [/"theme"\s*:\s*\{[\s\S]{0,400}?"name"\s*:\s*"([^"]+)"/, "inline Shopify theme JSON"],
    [/Shopify\.theme\s*=\s*\{[\s\S]{0,400}?"name"\s*:\s*"([^"]+)"/, "Shopify.theme"],
    [/themeName["']?\s*[:=]\s*["']([^"']+)["']/, "ShopifyAnalytics.meta.themeName"],
  ];
  for (const [re, source] of candidates) {
    const m = html.match(re);
    const name = m?.[1]?.replace(/ /g, " ").trim();
    if (!name) continue;
    // Same rejections the extension applies — internal ids aren't shopper-facing.
    if (/^rc-cm-\d{4}-/i.test(name)) continue;
    if (/^backup[-_]/i.test(name) || /_backup[-_]/i.test(name)) continue;
    if (/^\d{4}-\d{2}-\d{2}/.test(name)) continue;
    if (/\bdraft\b/i.test(name)) continue;
    return { name, source };
  }
  return null;
}

function detectApps(html: string): DetectedApp[] {
  const byName = new Map<string, DetectedApp>();

  for (const app of APP_SIGNATURES) {
    for (const pattern of app.patterns) {
      if (pattern.test(html)) {
        byName.set(app.name, {
          name: app.name,
          category: app.category,
          confidence: "confirmed",
          evidence: pattern.source,
        });
        break;
      }
    }
  }

  for (const rule of DOM_APP_MARKER_RULES) {
    if (!rule.re.test(html)) continue;
    const existing = byName.get(rule.name);
    if (existing && CONF_RANK[existing.confidence] >= CONF_RANK[rule.confidence]) continue;
    byName.set(rule.name, {
      name: rule.name,
      category: rule.category,
      confidence: rule.confidence,
      evidence: rule.re.source,
    });
  }

  return [...byName.values()].sort(
    (a, b) =>
      CONF_RANK[b.confidence] - CONF_RANK[a.confidence] ||
      a.category.localeCompare(b.category) ||
      a.name.localeCompare(b.name),
  );
}

export async function detectStore(rawInput: string): Promise<DetectResult> {
  const host = normalizeStoreInput(rawInput);
  if (!host) {
    return { ok: false, host: null, error: "That doesn't look like a store address. Try something like allbirds.com." };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`https://${host}/`, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "MakerPeekBot/1.0 (+https://makerpeek.com)",
        Accept: "text/html",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return { ok: false, host, error: `That store returned HTTP ${res.status}.` };
    }

    const reader = res.body?.getReader();
    let html = "";
    if (reader) {
      const decoder = new TextDecoder();
      let bytes = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        html += decoder.decode(value, { stream: true });
        if (bytes > MAX_BYTES) {
          await reader.cancel();
          break;
        }
      }
    } else {
      html = await res.text();
    }

    const isShopify = looksLikeShopify(html);
    const theme = extractTheme(html);

    return {
      ok: true,
      host,
      isShopify,
      apps: isShopify ? detectApps(html) : [],
      theme: theme?.name ?? null,
      themeSource: theme?.source ?? null,
    };
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return {
      ok: false,
      host,
      error: aborted
        ? "That store took too long to respond."
        : "Couldn't reach that store. Check the address and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
