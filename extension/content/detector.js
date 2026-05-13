// MakerPeek — Shopify Detector Content Script
// Runs at document_idle. Detects whether the current page is a Shopify store
// and, if so, fires a custom event that overlay.js listens for.

(function detectShopify() {
  const storeUrl = location.origin;

  // Signal 1: Shopify JS object injected by theme
  if (typeof window.Shopify !== "undefined") {
    dispatchDetected(storeUrl, "window.Shopify");
    return;
  }

  // Signal 2: Meta tag added by Shopify payments
  const metaTag = document.querySelector('meta[name="shopify-digital-wallet"]');
  if (metaTag) {
    dispatchDetected(storeUrl, "meta[shopify-digital-wallet]");
    return;
  }

  // Signal 3: Probe /products.json — lightweight JSON endpoint only Shopify stores expose
  // TODO: replace with a real fetch probe once content-script fetch is confirmed working
  //       fetch(`${storeUrl}/products.json?limit=1`, { method: "GET" })
  //         .then(r => r.ok && r.headers.get("content-type")?.includes("json") && dispatchDetected(...))
  //         .catch(() => {});
})();

function dispatchDetected(storeUrl, signal) {
  console.log(`[MakerPeek] Shopify detected via ${signal} on ${storeUrl}`);
  document.dispatchEvent(
    new CustomEvent("makerpeek:shopify-detected", { detail: { storeUrl } })
  );
}
