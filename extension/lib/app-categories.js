// MakerPeek - App stack category buckets (plain global script)

const APP_CATEGORIES = {
  reviews: {
    label: "Reviews",
    apps: [
      "loox",
      "judge-me",
      "yotpo",
      "stamped",
      "okendo",
      "fera",
      "opinew",
      "reviews-io",
      "klaviyo-reviews",
      "shopify-product-reviews",
      "junip",
    ],
  },
  email_sms: {
    label: "Email & SMS",
    apps: [
      "klaviyo",
      "omnisend",
      "privy",
      "mailchimp",
      "postscript",
      "attentive",
      "sms-bump",
      "drip",
      "shopify-email",
      "sendlane",
    ],
  },
  loyalty: {
    label: "Loyalty & rewards",
    apps: [
      "smile-io",
      "loyaltylion",
      "yotpo-loyalty",
      "rise-ai",
      "stamp-me",
      "gameball",
      "bon-loyalty",
      "growave",
    ],
  },
  subscriptions: {
    label: "Subscriptions",
    apps: [
      "recharge",
      "bold-subscriptions",
      "skio",
      "loop-subscriptions",
      "awtomic",
      "seal-subscriptions",
      "appstle-subscriptions",
      "paywhirl",
    ],
  },
  upsell: {
    label: "Upsell & cross-sell",
    apps: [
      "reconvert",
      "zipify-ocu",
      "aftersell",
      "honeycomb-upsell",
      "rebuy",
      "bold-upsell",
      "candy-rack",
      "frequently-bought-together",
      "in-cart-upsell",
    ],
  },
  search_filter: {
    label: "Search & filter",
    apps: [
      "boost-product-filter",
      "searchanise",
      "algolia",
      "klevu",
      "fast-simon",
      "instant-search",
      "wize-search",
    ],
  },
  pod_providers: {
    label: "Print providers",
    apps: [
      "printify",
      "printful",
      "gelato",
      "gooten",
      "customcat",
      "teelaunch",
      "apliiq",
      "pillow-profits",
      "shineon",
    ],
  },
  support: {
    label: "Customer support",
    apps: [
      "gorgias",
      "zendesk",
      "reamaze",
      "tidio",
      "shopify-inbox",
      "helpscout",
      "crisp",
      "gladly",
      "intercom",
    ],
  },
  analytics: {
    label: "Analytics",
    apps: [
      "triple-whale",
      "lifetimely",
      "google-analytics",
      "hotjar",
      "microsoft-clarity",
      "glew",
      "peel-insights",
      "segment",
      "mixpanel",
      "fairing",
    ],
  },
  ads_marketing: {
    label: "Ads & marketing",
    apps: [
      "adroll",
      "facebook-pixel",
      "tiktok-pixel",
      "google-ads",
      "pinterest-tag",
      "tapcart",
      "shopify-audiences",
    ],
  },
  shipping_returns: {
    label: "Shipping & returns",
    apps: [
      "shippo",
      "aftership",
      "shipstation",
      "returnly",
      "loop-returns",
      "narvar",
      "parcel-panel",
      "route",
    ],
  },
};

function normalizeAppSlug(app) {
  return (app.id || app.slug || app.name || "")
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/\./g, "-");
}

function categorizeAppStack(appStack) {
  if (!appStack || appStack.length === 0) return [];

  const categorized = {};
  const uncategorized = [];

  for (const app of appStack) {
    const slug = normalizeAppSlug(app);
    let found = false;
    for (const [catId, cat] of Object.entries(APP_CATEGORIES)) {
      if (cat.apps.includes(slug)) {
        if (!categorized[catId]) categorized[catId] = { label: cat.label, apps: [] };
        categorized[catId].apps.push(app);
        found = true;
        break;
      }
    }
    if (!found) uncategorized.push(app);
  }

  const ordered = Object.entries(categorized).map(([id, c]) => ({ id, ...c }));
  if (uncategorized.length > 0) {
    ordered.push({ id: "other", label: "Other", apps: uncategorized });
  }
  return ordered;
}

function limitForFree(categorized, limit = 3) {
  let shown = 0;
  const visibleCategories = [];
  for (const cat of categorized) {
    if (shown >= limit) break;
    const remaining = limit - shown;
    const appsToShow = cat.apps.slice(0, remaining);
    visibleCategories.push({ ...cat, apps: appsToShow, totalInCategory: cat.apps.length });
    shown += appsToShow.length;
  }
  return visibleCategories;
}
