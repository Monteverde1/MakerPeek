// MakerPeek - Bestsellers from Shopify collection sort (plain global script)

const MP_BESTSELLERS_MAX = 25;

async function fetchBestsellers(origin) {
  const url = `${origin}/collections/all?sort_by=best-selling`;
  const res = await fetch(url, { credentials: "omit" });
  if (!res.ok) {
    throw new Error(`Bestsellers fetch failed: HTTP ${res.status}`);
  }
  const html = await res.text();
  const doc = new DOMParser().parseFromString(html, "text/html");

  const links = Array.from(doc.querySelectorAll('a[href*="/products/"]'));
  const handles = [];
  const seen = new Set();
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href) continue;
    const match = href.match(/\/products\/([^/?#]+)/);
    if (match && !seen.has(match[1])) {
      seen.add(match[1]);
      handles.push(match[1]);
      if (handles.length >= MP_BESTSELLERS_MAX) break;
    }
  }
  return handles;
}

function joinBestsellersWithCatalog(handles, products) {
  const byHandle = new Map((products || []).map((p) => [p.handle, p]));
  const result = [];
  for (let i = 0; i < handles.length; i++) {
    const product = byHandle.get(handles[i]);
    if (!product) continue;
    const variants = product.variants || [];
    const prices = variants.map((v) => parseFloat(v.price)).filter((p) => !isNaN(p));
    const compares = variants
      .map((v) => (v.compare_at_price ? parseFloat(v.compare_at_price) : null))
      .filter((p) => p != null && !isNaN(p));
    const minPrice = prices.length ? Math.min(...prices) : null;
    const minCompare = compares.length ? Math.min(...compares) : null;
    result.push({
      rank: i + 1,
      handle: product.handle,
      title: product.title,
      price: minPrice,
      compareAtPrice: minCompare,
      onSale: minCompare != null && minPrice != null && minCompare > minPrice,
      productType: product.product_type,
    });
  }
  return result;
}
