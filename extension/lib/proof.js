// MakerPeek proof copy for panel tooltips (plain global script).

function mpProofMethodology(metricKey, source) {
  const s = source || "bulk_json";

  const map = {
    products: {
      bulk_json:
        "We hit /products.json. It paginates at 250 per page. We walk pages until one comes back empty, then group rows by title in the panel.",
      blocked: "Unavailable. The store blocked catalog endpoints.",
    },
    totalVariants: {
      bulk_json: "We add up every variant on every row we fetched from /products.json.",
      blocked: "Unavailable.",
    },
    listingPriceSpan: {
      bulk_json: "Low and high of each product's cheapest first-variant price from /products.json.",
      blocked: "Unavailable.",
    },
    avgListingPrice: {
      bulk_json: "Mean of those per-product cheapest starters from /products.json.",
      blocked: "Unavailable.",
    },
    newProducts: {
      bulk_json:
        "Products with created_at in the last 30 days. Restocks of older listings are not counted as new.",
      blocked: "Unavailable.",
    },
    productsOnSale: {
      bulk_json: "A product counts if any variant has compare_at_price above price.",
      blocked: "Unavailable.",
    },
    fullySoldOut: {
      bulk_json: "A product counts only when every variant on every row is unavailable.",
      blocked: "Unavailable.",
    },
    discountLevel: {
      bulk_json: "On-sale grouped products divided by the headline product count.",
      blocked: "Unavailable.",
    },
    publishingSince: {
      bulk_json: "Oldest published_at among the rows we fetched.",
      blocked: "Unavailable.",
    },
    avgProductsPerMonth: {
      bulk_json: "Grouped product count divided by months since that oldest published_at.",
      blocked: "Unavailable.",
    },
    distinctVendors: {
      bulk_json: "Unique vendor strings on the fetched rows.",
      blocked: "Unavailable.",
    },
    avgVariantsPerProduct: {
      bulk_json: "Total variants divided by grouped product count.",
      blocked: "Unavailable.",
    },
    medianPrice: {
      bulk_json: "Median of per-product cheapest starters.",
      blocked: "Unavailable.",
    },
    priceSpread: {
      bulk_json: "Standard deviation of those cheapest starters.",
      blocked: "Unavailable.",
    },
    theme: {
      bulk_json: "From Shopify.theme and scripts on the page (no catalog fetch needed).",
      blocked: "Same sources on the page.",
    },
    appStack: {
      bulk_json: "Matched from HTML and asset URL signatures on the storefront.",
      blocked: "Same.",
    },
    changesSinceLastVisit: {
      bulk_json: "Diff of snapshots saved locally between your visits on this device.",
      blocked: "Needs a prior full catalog snapshot on this device.",
    },
    bestsellers: {
      bulk_json:
        "Rank order from Shopify's public best-selling collection sort. We read the order Shopify shows, not a guess. All-time sort, so older hits can sit above recent launches. Top 5 shown by default. Click to expand the full list.",
      blocked: "Unavailable when the catalog is blocked.",
    },
    pricing_distribution: {
      bulk_json:
        "Each grouped product lands in a bucket by its cheapest variant price from /products.json.",
      blocked: "Unavailable when the catalog is blocked.",
    },
  };

  return map[metricKey]?.[s] || map[metricKey]?.bulk_json || "See makerpeek.com for methodology.";
}

function mpProofVerifyPath(metricKey, source) {
  const s = source || "bulk_json";
  if (s === "blocked") {
    if (metricKey === "theme" || metricKey === "appStack") {
      return null;
    }
    return null;
  }
  if (metricKey === "bestsellers") {
    return "/collections/all?sort_by=best-selling";
  }
  if (metricKey === "newProducts" || metricKey === "products" || metricKey === "pricing_distribution") {
    return "/products.json?limit=250";
  }
  return "/products.json?limit=250";
}

function mpProofPlainEnglish(metricKey, source) {
  return mpProofMethodology(metricKey, source);
}

function mpBuildVerifyUrl(domain, metricKey, source) {
  const path = mpProofVerifyPath(metricKey, source);
  if (!path) return null;
  return `https://${domain}${path}`;
}
