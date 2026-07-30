/**
 * Validates store URLs before server-side fetch (SSRF mitigation).
 * Call from API routes that will request arbitrary user-supplied URLs.
 */

export class UnsafeStoreUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeStoreUrlError";
  }
}

/** Allowed protocols for Shopify storefront URLs */
export function parsePublicHttpsStoreUrl(rawUrl: string): URL {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new UnsafeStoreUrlError("invalid_url");
  }

  if (url.protocol !== "https:") {
    throw new UnsafeStoreUrlError("https_required");
  }

  const host = url.hostname.toLowerCase();

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new UnsafeStoreUrlError("localhost_forbidden");
  }

  const ipv4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const m = host.match(ipv4);
  if (m) {
    const oct = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
    if (oct.some((n) => n > 255)) throw new UnsafeStoreUrlError("invalid_ip");

    const [a, b] = oct;
    if (a === 10) throw new UnsafeStoreUrlError("private_ip");
    if (a === 127) throw new UnsafeStoreUrlError("loopback_ip");
    if (a === 0) throw new UnsafeStoreUrlError("reserved_ip");
    if (a === 169 && b === 254) throw new UnsafeStoreUrlError("link_local_ip");
    if (a === 172 && b >= 16 && b <= 31) throw new UnsafeStoreUrlError("private_ip");
    if (a === 192 && b === 168) throw new UnsafeStoreUrlError("private_ip");
  }

  // IPv6-ish brackets appeared without going through URL parser quirks — hostname should not contain '[' for normal Shopify URLs
  if (host.includes(":")) {
    throw new UnsafeStoreUrlError("ipv6_not_supported");
  }

  return url;
}
