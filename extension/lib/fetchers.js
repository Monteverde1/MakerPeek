// PRICING: $11/mo or $99/yr (save $33 = 25% off)
// MakerPeek - Catalog fetch (bulk /products.json only; hard-fail when blocked)
// Plain global script; loaded before overlay.js.

const MP_BULK_MAX_PAGES = 20;
const MP_BULK_PAGE_SIZE = 250;
const MP_BULK_PAGE_TIMEOUT_MS = 7000;

/**
 * @param {string} origin
 * @param {{ onProgress?: (meta: object) => void }} [options]
 */
async function fetchStoreCatalog(origin, options = {}) {
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
  const result = {
    products: [],
    source: null,
    error: null,
    pageCounts: [],
    fetchedAt: new Date().toISOString(),
    capped: false,
    errorState: null,
  };

  try {
    onProgress?.({ phase: "products", page: 1, strategy: "bulk_json" });
    const bulk = await fetchBulkJson(origin, { onProgress });
    if (bulk.products.length > 0) {
      result.products = bulk.products;
      result.source = "bulk_json";
      result.pageCounts = bulk.pageCounts;
      result.capped = bulk.capped;
      result.errorState = bulk.errorState;
            return result;
    }
    throw new Error("Empty catalog");
  } catch (e) {
    result.source = "blocked";
    result.error = e.message;
        return result;
  }
}

async function fetchBulkJson(origin, options = {}) {
  const onProgress = options.onProgress;
  const seen = new Map();
  const pageCounts = [];
  let errorState = null;

  for (let page = 1; page <= MP_BULK_MAX_PAGES; page++) {
    onProgress?.({ phase: "products", page, totalPages: MP_BULK_MAX_PAGES, strategy: "bulk_json" });

    let pageProducts;
    try {
      pageProducts = await fetchBulkJsonPage(origin, page, MP_BULK_PAGE_SIZE, MP_BULK_PAGE_TIMEOUT_MS);
    } catch (err) {
      errorState = {
        code: err.code || "PAGE_FETCH_FAILED",
        page,
        message: String(err.message || err),
      };
      if (page === 1) throw err;
      break;
    }

    pageCounts.push(pageProducts.length);
    for (const p of pageProducts) {
      if (p.id != null && !seen.has(p.id)) seen.set(p.id, p);
    }

    if (pageProducts.length === 0) break;
    if (pageProducts.length < MP_BULK_PAGE_SIZE) break;
  }

  const products = Array.from(seen.values());
  const capped =
    products.length >= 2500 ||
    (pageCounts.length >= MP_BULK_MAX_PAGES &&
      pageCounts[pageCounts.length - 1] === MP_BULK_PAGE_SIZE);

  return { products, pageCounts, capped, errorState };
}

async function fetchBulkJsonPage(origin, page, pageSize, timeoutMs, isRetryAfter429 = false) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `${origin}/products.json?limit=${pageSize}&page=${page}`;
    const res = await fetch(url, {
      signal: ctrl.signal,
      credentials: "omit",
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);

    if (res.status === 429 && !isRetryAfter429) {
      await new Promise((r) => setTimeout(r, 1500));
      return fetchBulkJsonPage(origin, page, pageSize, timeoutMs, true);
    }

    if (!res.ok) {
      const code = res.status === 429 ? "RATE_LIMIT" : `HTTP_${res.status}`;
      throw Object.assign(new Error(`HTTP ${res.status} on page ${page}`), { code });
    }

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) {
      throw Object.assign(new Error("Non-JSON response"), { code: "NOT_JSON" });
    }

    const data = await res.json();
    return Array.isArray(data.products) ? data.products : [];
  } catch (err) {
    clearTimeout(timer);
    if (err?.name === "AbortError") {
      throw Object.assign(new Error("Page fetch timed out"), { code: "TIMEOUT" });
    }
    throw err;
  }
}

function logCatalogFetch(_domain, _catalog) {
  /* no-op in production builds */
}
