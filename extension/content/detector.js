// MakerPeek - Shopify Detector
// Runs in the content script context. detectShopify() is also called directly
// by overlay.js (same context) via the shared isolated world.

// ─── App signatures (HTML + asset URL regex) ─────────────────────────────────

const APP_SIGNATURES = [
  // Reviews
  { name: "Klaviyo",            category: "Email",              patterns: [/klaviyo\.com/i, /static\.klaviyo/i] },
  { name: "Mailchimp",          category: "Email",              patterns: [/chimpstatic\.com/i, /list-manage\.com/i] },
  { name: "Omnisend",           category: "Email",              patterns: [/omnisend\.com/i] },
  { name: "Loox",               category: "Reviews",            patterns: [/loox\.io/i] },
  { name: "Judge.me",           category: "Reviews",            patterns: [/judge\.me/i, /cdn\.judge\.me/i] },
  { name: "Yotpo",              category: "Reviews",            patterns: [/yotpo\.com/i, /staticw2\.yotpo/i] },
  { name: "Stamped",            category: "Reviews",            patterns: [/stamped\.io/i] },
  { name: "Okendo",             category: "Reviews",            patterns: [/okendo\.io/i] },
  { name: "Reviews.io",         category: "Reviews",            patterns: [/reviews\.io/i, /widget\.reviews\.co\.uk/i] },
  { name: "Junip",              category: "Reviews",            patterns: [/junip\.co/i] },
  { name: "Ali Reviews",        category: "Reviews",            patterns: [/alireviews/i, /fireapps/i] },
  { name: "Rivyo",              category: "Reviews",            patterns: [/rivyo/i] },
  { name: "Shopper Approved",   category: "Reviews",            patterns: [/shopperapproved\.com/i] },
  { name: "Opinew",             category: "Reviews",            patterns: [/opinewcdn/i, /opinew\.io/i] },
  { name: "Growave",            category: "Reviews / Loyalty",  patterns: [/growave\.io/i] },
  { name: "Air Reviews",        category: "Reviews",            patterns: [/airreviews/i] },
  { name: "Fera",               category: "Reviews",            patterns: [/app\.fera\.ai/i, /feracloud/i] },
  // Subscriptions
  { name: "Recharge",           category: "Subscriptions",      patterns: [/rechargepayments\.com/i, /recharge-checkout/i] },
  { name: "Bold Subscriptions", category: "Subscriptions",      patterns: [/boldapps\.net/i] },
  { name: "Skio",               category: "Subscriptions",      patterns: [/skio\.com/i] },
  { name: "Loop",               category: "Subscriptions",      patterns: [/loopsubscriptions/i] },
  { name: "Subbly",             category: "Subscriptions",      patterns: [/subbly\.co/i] },
  { name: "Appstle",            category: "Subscriptions",      patterns: [/appstle/i] },
  { name: "Seal Subscriptions", category: "Subscriptions",      patterns: [/sealsubscriptions/i] },
  { name: "PayWhirl",           category: "Subscriptions",      patterns: [/paywhirl/i] },
  { name: "Recurpay",           category: "Subscriptions",      patterns: [/recurpay/i] },
  // All-in-one
  { name: "Vitals",             category: "All-in-one",         patterns: [/vitals\.co/i, /appvitals/i] },
  // Page builders
  { name: "PageFly",            category: "Page builder",       patterns: [/pagefly/i] },
  { name: "GemPages",           category: "Page builder",       patterns: [/gempages/i] },
  { name: "Shogun",             category: "Page builder",       patterns: [/getshogun\.com/i] },
  { name: "Replo",              category: "Page builder",       patterns: [/replo\.app/i] },
  { name: "LayoutHub",          category: "Page builder",       patterns: [/layouthub/i] },
  { name: "Ecomposer",          category: "Page builder",       patterns: [/ecomposer/i] },
  { name: "Tapita",             category: "Page builder",       patterns: [/tapita\.io/i] },
  // Popups
  { name: "Privy",              category: "Popups",             patterns: [/privy\.com/i] },
  { name: "Justuno",            category: "Popups",             patterns: [/justuno\.com/i] },
  // Loyalty
  { name: "Smile.io",           category: "Loyalty",            patterns: [/smile\.io/i] },
  { name: "LoyaltyLion",        category: "Loyalty",            patterns: [/loyaltylion/i] },
  { name: "Yotpo Loyalty",      category: "Loyalty",            patterns: [/swellrewards/i] },
  { name: "Rivo",               category: "Loyalty",            patterns: [/rivo\.io/i] },
  { name: "Bonify",             category: "Loyalty",            patterns: [/bonify\.io/i] },
  // Support
  { name: "Gorgias",            category: "Support",            patterns: [/gorgias\.chat/i, /gorgias\.com/i] },
  { name: "Tidio",              category: "Support",            patterns: [/tidio\.co/i] },
  { name: "Zendesk",            category: "Support",            patterns: [/zendesk\.com/i, /zdassets/i] },
  { name: "Intercom",           category: "Support",            patterns: [/intercom\.io/i, /intercomcdn/i] },
  { name: "Crisp",              category: "Support",            patterns: [/crisp\.chat/i] },
  { name: "Drift",              category: "Support",            patterns: [/drift\.com/i] },
  { name: "LiveChat",           category: "Support",            patterns: [/livechatinc\.com/i] },
  { name: "Re:amaze",           category: "Support",            patterns: [/reamaze\.com/i] },
  { name: "HelpScout",          category: "Support",            patterns: [/helpscout\.net/i, /beacon-v2/i] },
  // Upsell
  { name: "ReConvert",          category: "Upsell",             patterns: [/reconvert/i] },
  { name: "Honeycomb Upsell",   category: "Upsell",             patterns: [/conversionbear/i] },
  { name: "Zipify OCU",         category: "Upsell",             patterns: [/zipify/i, /ocu\.io/i] },
  { name: "CartHook",           category: "Upsell",             patterns: [/carthook/i] },
  { name: "Bold Bundles",       category: "Upsell",             patterns: [/boldapps\.net.*bundle/i] },
  { name: "Frequently Bought Together", category: "Upsell",     patterns: [/code-black-belt/i] },
  { name: "Rebuy",              category: "Upsell",             patterns: [/rebuyengine/i] },
  { name: "LimeSpot",           category: "Upsell",             patterns: [/limespot/i, /limecdn/i] },
  { name: "InCart Upsell",      category: "Upsell",             patterns: [/incartupsell/i] },
  // Fulfillment / POD
  { name: "Printful",           category: "Fulfillment / POD",  patterns: [/printful\.com/i] },
  { name: "Printify",           category: "Fulfillment / POD",  patterns: [/printify\.com/i] },
  { name: "ShipBob",            category: "Fulfillment",        patterns: [/shipbob/i] },
  { name: "Shippo",             category: "Fulfillment",        patterns: [/goshippo/i] },
  { name: "Gooten",             category: "Fulfillment / POD",  patterns: [/gooten\.com/i] },
  { name: "CustomCat",          category: "Fulfillment / POD",  patterns: [/customcat/i] },
  { name: "SPOD",               category: "Fulfillment / POD",  patterns: [/spod\.com/i] },
  { name: "T-Pop",              category: "Fulfillment / POD",  patterns: [/t-pop\.com/i] },
  { name: "JetPrint",           category: "Fulfillment / POD",  patterns: [/jetprint/i] },
  { name: "Apliiq",             category: "Fulfillment / POD",  patterns: [/apliiq/i] },
  { name: "AOP+",               category: "Fulfillment / POD",  patterns: [/aopplus/i] },
  // Returns / Tracking
  { name: "Loop Returns",       category: "Returns",            patterns: [/loopreturns/i] },
  { name: "Returnly",           category: "Returns",            patterns: [/returnly\.com/i] },
  { name: "AfterShip",          category: "Returns / Tracking", patterns: [/aftership\.com/i] },
  { name: "Route",              category: "Shipping protection",patterns: [/routeapp\.io/i, /route\.com/i] },
  { name: "Narvar",             category: "Returns / Tracking", patterns: [/narvar/i] },
  { name: "Wonderment",         category: "Post-purchase",      patterns: [/wonderment/i] },
  // Search
  { name: "Algolia",            category: "Search",             patterns: [/algolianet/i, /algolia\.com/i] },
  { name: "Searchanise",        category: "Search",             patterns: [/searchanise/i] },
  { name: "Boost AI Search",    category: "Search",             patterns: [/boostcommerce/i] },
  { name: "Klevu",              category: "Search",             patterns: [/klevu\.com/i] },
  { name: "Fast Simon",         category: "Search",             patterns: [/fast-simon|instantsearchplus|shopifypreview/i] },
  { name: "Findify",            category: "Search",             patterns: [/findify/i] },
  // Quiz / Forms
  { name: "Octane AI",          category: "Quiz",               patterns: [/octaneai\.com/i] },
  { name: "Typeform",           category: "Forms",              patterns: [/typeform\.com/i] },
  { name: "Jebbit",             category: "Quiz",               patterns: [/jebbit/i] },
  // BNPL / Payments
  { name: "Klarna",             category: "Payments / BNPL",    patterns: [/klarna\.com/i, /klarnacdn/i] },
  { name: "Afterpay",           category: "Payments / BNPL",    patterns: [/afterpay\.com/i] },
  { name: "Affirm",             category: "Payments / BNPL",    patterns: [/affirm\.com/i] },
  { name: "Sezzle",             category: "Payments / BNPL",    patterns: [/sezzle\.com/i] },
  // Analytics
  { name: "Google Analytics",   category: "Analytics",          patterns: [/google-analytics\.com/i, /googletagmanager\.com/i] },
  { name: "Meta Pixel",         category: "Analytics",          patterns: [/connect\.facebook\.net/i, /fbevents/i] },
  { name: "TikTok Pixel",       category: "Analytics",          patterns: [/analytics\.tiktok\.com/i] },
  { name: "Hotjar",             category: "Analytics",          patterns: [/hotjar\.com/i] },
  { name: "Triple Whale",       category: "Analytics",          patterns: [/triplewhale/i] },
  { name: "Lifetimely",         category: "Analytics",          patterns: [/lifetimely/i] },
  { name: "Northbeam",          category: "Analytics",          patterns: [/northbeam/i] },
  { name: "Microsoft Clarity",  category: "Analytics",          patterns: [/clarity\.ms/i] },
  { name: "Snap Pixel",         category: "Analytics",          patterns: [/sc-static\.net/i] },
  { name: "Pinterest Tag",      category: "Analytics",          patterns: [/pintrk/i, /pinimg\.com\/ct/i] },
  { name: "Elevar",             category: "Analytics",          patterns: [/elevar/i] },
  { name: "Littledata",         category: "Analytics",          patterns: [/littledata/i] },
  // Affiliate
  { name: "Refersion",          category: "Affiliate",          patterns: [/refersion/i] },
  { name: "GoAffPro",           category: "Affiliate",          patterns: [/goaffpro/i] },
  { name: "UpPromote",          category: "Affiliate",          patterns: [/uppromote/i] },
  // SMS marketing
  { name: "Postscript",         category: "SMS",                patterns: [/postscript\.io/i] },
  { name: "Attentive",          category: "SMS",                patterns: [/attentive\.com/i, /attn\.tv/i] },
  { name: "SMSBump",            category: "SMS",                patterns: [/smsbump/i] },
  { name: "Emotive",            category: "SMS",                patterns: [/emotiveapp/i] },
  { name: "Voyage SMS",         category: "SMS",                patterns: [/voyage-messaging/i] },
  // Email
  { name: "Drip",               category: "Email",              patterns: [/getdrip\.com/i] },
  { name: "ActiveCampaign",     category: "Email",              patterns: [/activecampaign\.com/i] },
  { name: "Sendlane",           category: "Email",              patterns: [/sendlane\.com/i] },
  // Product customizers
  { name: "Customily",          category: "Product customizer", patterns: [/customily/i] },
  { name: "Zakeke",             category: "Product customizer", patterns: [/zakeke/i] },
  { name: "Hulk Product Options", category: "Product customizer", patterns: [/hulkapps/i] },
  // Translation / currency / accounts / wishlist
  { name: "Weglot",             category: "Translation",        patterns: [/weglot/i] },
  { name: "Langify",            category: "Translation",        patterns: [/langify/i] },
  { name: "GTranslate",         category: "Translation",        patterns: [/gtranslate/i] },
  { name: "BEST Currency",      category: "Currency",           patterns: [/best\-currency\-converter/i, /bold\-currency/i] },
  { name: "Flits",              category: "Customer accounts",  patterns: [/getflits/i, /shopify\-flits/i] },
  { name: "Wishlist Plus",      category: "Wishlist",           patterns: [/swymcorp/i, /swymrelay/i] },
  { name: "Wishlist Hero",      category: "Wishlist",           patterns: [/wishlisthero/i] },
  { name: "Global-e",           category: "Cross-border",       patterns: [/global-e/i, /globalcheckout/i] },
  { name: "KnoCommerce",        category: "Surveys",            patterns: [/knocommerce/i] },
  { name: "Fairing",            category: "Surveys",            patterns: [/fairing/i] },
  /* Additional surfaces for typical mid-size storefronts */
  { name: "Nosto",              category: "Personalization",    patterns: [/nosto\.com/i, /connect\.nosto/i] },
  { name: "PushOwl",            category: "Push notifications",patterns: [/pushowl/i] },
  { name: "Recart",             category: "SMS / Email",       patterns: [/recart\.com/i, /cdn\.recart/i] },
  { name: "Back in Stock",      category: "Alerts",             patterns: [/back-in-stock|backinstock/i, /stockify/i] },
  { name: "Instafeed",          category: "Social proof",       patterns: [/instafeed/i] },
  { name: "Smartlook",          category: "Analytics",          patterns: [/smartlook/i] },
  { name: "Heap",               category: "Analytics",          patterns: [/heap-analytics/i, /cdn\.heap/i] },
  { name: "Segment",            category: "Analytics",          patterns: [/segment\.com/i, /analytics\.segment/i] },
  { name: "Amplitude",          category: "Analytics",          patterns: [/amplitude\.com/i] },
  { name: "Mixpanel",           category: "Analytics",          patterns: [/mixpanel\.com/i] },
  { name: "Klaviyo Reviews",    category: "Reviews",            patterns: [/klaviyo\.com.*reviews/i] },
  { name: "Judge.me Imports",   category: "Reviews",            patterns: [/judgeme[-_]import/i] },
  { name: "ParcelPanel",        category: "Tracking",           patterns: [/parcelpanel/i] },
  { name: "Easyship",           category: "Shipping",           patterns: [/easyship/i] },
  { name: "ShipStation",        category: "Shipping",           patterns: [/shipstation/i] },
  { name: "ShipHero",           category: "Fulfillment",        patterns: [/shiphero/i] },
  { name: "Veeqo",              category: "Fulfillment",        patterns: [/veeqo/i] },
  { name: "Skubana",            category: "Inventory",          patterns: [/skubana/i] },
  { name: "CedCommerce",        category: "Marketplace sync",    patterns: [/cedcommerce/i] },
  { name: "SEO Manager",        category: "SEO",               patterns: [/seo[-_]manager/i, /plug.?in.?seo/i] },
  { name: "SearchPie",          category: "SEO",               patterns: [/searchpie/i] },
  { name: "JSON-LD for SEO",    category: "SEO",               patterns: [/json\-ld.*?seo/i, /illumifyseo/i] },
  { name: "Wiser",              category: "Upsell",            patterns: [/wiser[-_]personalized/i] },
  { name: "Honey Apps",         category: "Upsell",            patterns: [/honeyapps/i] },
  { name: "Ultimate Upsell",    category: "Upsell",            patterns: [/ultimate\-upsell/i] },
  { name: "Candy Rack",         category: "Upsell",            patterns: [/candyrack/i] },
  { name: "Selleasy",           category: "Upsell",            patterns: [/selleasy/i] },
  { name: "Kaching Bundles",    category: "Bundles",           patterns: [/kaching[-_]bundles/i] },
  { name: "Videowise",          category: "Video",             patterns: [/videowise/i] },
  { name: "Tolstoy",            category: "Video",             patterns: [/tolstoy\.sh/i] },
  { name: "Cartloop",           category: "SMS / Chat",       patterns: [/cartloop/i] },
  { name: "Firepush",           category: "SMS / Push",       patterns: [/firepush/i] },
  { name: "AdRoll",             category: "Ads",               patterns: [/adroll/i] },
  { name: "Sixads",             category: "Ads",               patterns: [/sixads/i] },
  { name: "Builder.io",         category: "Page builder",      patterns: [/builder\.io/i] },
  { name: "Tapcart",            category: "Mobile app",       patterns: [/tapcart/i] },
];

const DOM_APP_MARKER_RULES = [
  { name: "Klaviyo",            category: "Email",        re: /\bklaviyo[-_\s]/i,               confidence: "likely" },
  { name: "Postscript",         category: "SMS",          re: /\bpostscript[-_\s.]/i,           confidence: "likely" },
  { name: "Attentive",          category: "SMS",          re: /\battentive[-_\s]/i,             confidence: "possible" },
  { name: "Recharge",           category: "Subscriptions", re: /\brecharge[-_\s]/i,             confidence: "likely" },
  { name: "Skio",               category: "Subscriptions", re: /\bskio[-_\s]/i,                 confidence: "possible" },
  { name: "Yotpo",              category: "Reviews",      re: /\byotpo[-_\s]/i,                 confidence: "likely" },
  { name: "Judge.me",           category: "Reviews",      re: /\bjudge[_-]?me[-_\s]/i,          confidence: "likely" },
  { name: "Loox",               category: "Reviews",      re: /\bloox[-_\s]/i,                  confidence: "likely" },
  { name: "Omnisend",           category: "Email",        re: /\bomnisend[-_\s]/i,              confidence: "likely" },
  { name: "Stamped",            category: "Reviews",      re: /\bstamped[-_\s]/i,               confidence: "likely" },
  { name: "Privy",              category: "Popups",       re: /\bprivy[-_\s]/i,                 confidence: "possible" },
  { name: "Justuno",            category: "Popups",       re: /\bjustuno[-_\s]/i,               confidence: "possible" },
  { name: "Gorgias",            category: "Support",      re: /\bgorgias[-_\s]/i,               confidence: "possible" },
  { name: "Tidio",              category: "Support",      re: /\btidio[-_\s]/i,                 confidence: "possible" },
  { name: "Smile.io",           category: "Loyalty",      re: /\bsmile[-_\s](io|reward)/i,       confidence: "possible" },
  { name: "LoyaltyLion",        category: "Loyalty",      re: /\bloyaltylion[-_\s]/i,          confidence: "possible" },
  { name: "Hotjar",             category: "Analytics",    re: /\bdata-hj-|_hj\-/i,              confidence: "possible" },
  { name: "Algolia",            category: "Search",       re: /\balgolia[-_\s]|docsearch/i,       confidence: "possible" },
  { name: "Weglot",             category: "Translation",  re: /\bweglot[-_\s]|data-weglot/i,     confidence: "possible" },
  { name: "Flits",              category: "Customer accounts", re: /\bflits[-_\s]/i,            confidence: "possible" },
  { name: "Printful",           category: "Fulfillment / POD", re: /\bprintful[-_\s]/i,         confidence: "possible" },
  { name: "Printify",           category: "Fulfillment / POD", re: /\bprintify[-_\s]/i,         confidence: "possible" },
  { name: "ReConvert",          category: "Upsell",       re: /\breconvert[-_\s]/i,             confidence: "possible" },
  { name: "PageFly",            category: "Page builder", re: /\bpagefly[-_\s]/i,               confidence: "possible" },
  { name: "GemPages",           category: "Page builder", re: /\bgempages[-_\s]/i,              confidence: "possible" },
];

const CONF_RANK = { confirmed: 3, likely: 2, possible: 1 };

const SHOPIFY_SIGNAL_DEFS = {
  shopify_global:    { weight: 2, label: "shopify_global" },
  shopify_analytics: { weight: 2, label: "shopify_analytics" },
  shopify_routes:    { weight: 2, label: "shopify_routes" },
  meta_generator:    { weight: 2, label: "meta_generator" },
  cdn_reference:     { weight: 1, label: "cdn_reference" },
  monorail_endpoint: { weight: 1, label: "monorail_endpoint" },
};

function dashVal(v) {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

function isValidShopifyProductsPayload(data) {
  if (!data || !Array.isArray(data.products)) return false;
  if (data.products.length === 0) return true;
  const p = data.products[0];
  return !!(p && Array.isArray(p.variants) && "vendor" in p && "product_type" in p);
}

function collectShopifySignals() {
  const html = document.documentElement.outerHTML;
  const metaContent = document.querySelector('meta[name="generator"]')?.content?.trim() || "";

  const shopGlobalMatched =
    typeof window.Shopify !== "undefined" && window.Shopify?.shop != null;
  const shopGlobalValue = shopGlobalMatched ? String(window.Shopify.shop) : null;

  const analyticsMatched = typeof window.ShopifyAnalytics !== "undefined";
  const routesMatched =
    typeof window.Shopify?.routes === "object" && window.Shopify.routes !== null;

  const metaMatched = /^(Shopify(\ [\d.]+)?)$/i.test(metaContent);

  const cdnRe = /cdn\.shopify\.com|cdn\.shopifycdn\.net/i;
  let cdnValue = null;
  for (const el of document.querySelectorAll('script[src], link[href], link[rel="stylesheet"][href]')) {
    const u = el.src || el.getAttribute("href") || "";
    if (cdnRe.test(u)) {
      cdnValue = u;
      break;
    }
  }
  if (!cdnValue && cdnRe.test(html)) cdnValue = "inline HTML reference";

  const monorailRe = /monorail-edge\.shopifysvc\.com/i;
  let monorailValue = null;
  if (monorailRe.test(html)) monorailValue = "inline HTML reference";

  return {
    shopify_global:    { matched: shopGlobalMatched, value: shopGlobalValue },
    shopify_analytics: { matched: analyticsMatched, value: analyticsMatched ? "present" : null },
    shopify_routes:    { matched: routesMatched, value: routesMatched ? "present" : null },
    meta_generator:    { matched: metaMatched, value: metaContent || null },
    cdn_reference:     { matched: !!cdnValue, value: cdnValue },
    monorail_endpoint: { matched: !!monorailValue, value: monorailValue },
  };
}

function scoreShopifySignals(signalMap) {
  let score = 0;
  for (const [key, row] of Object.entries(signalMap)) {
    if (row.matched) score += SHOPIFY_SIGNAL_DEFS[key]?.weight || 0;
  }
  return score;
}

function resolveShopifyConfidence(score, productsEndpoint) {
  const shapeValid = !!productsEndpoint?.shape_valid;
  if (score >= 2) return "confirmed";
  if (score === 1 && shapeValid) return "confirmed";
  if (score === 1) return "uncertain";
  return "none";
}

function detectShopPayStrict() {
  if (document.querySelector("shop-pay-button")) {
    return { matched: true, method: "dom", evidence: "shop-pay-button" };
  }
  const payIframe = document.querySelector('iframe[src*="pay.shopify.com"]');
  if (payIframe) {
    return { matched: true, method: "iframe", evidence: payIframe.src || "iframe[src*=pay.shopify.com]" };
  }
  const shopAppIframe = document.querySelector('iframe[src*="shop.app"]');
  if (shopAppIframe) {
    return { matched: true, method: "iframe", evidence: shopAppIframe.src || "iframe[src*=shop.app]" };
  }
  if (window.Shopify?.PaymentButton) {
    return { matched: true, method: "global", evidence: "Shopify.PaymentButton" };
  }
  return { matched: false, method: "none", evidence: null };
}

function detectAppsFromSignatures(html, _traceOut) {
  const out = [];
  for (const app of APP_SIGNATURES) {
    let matched = false;
    let evidence = null;
    for (const pattern of app.patterns) {
      if (pattern.test(html)) {
        matched = true;
        evidence = pattern.source;
        out.push({
          name:           app.name,
          category:       app.category,
          matchedPattern: pattern.source,
          confidence:     "confirmed",
          detail:         "Matched known pattern in page HTML or assets",
        });
        break;
      }
    }
    if (_traceOut) {
      _traceOut.push({
        name: app.name,
        matched,
        method: matched ? "none" : "none",
        evidence: evidence || null,
      });
    }
  }
  return out;
}

function detectAppsFromMarkers(html, _traceOut) {
  const lower = typeof html === "string" ? html : "";
  const hits  = [];
  for (const rule of DOM_APP_MARKER_RULES) {
    const matched = rule.re.test(lower);
    if (matched) {
      hits.push({
        name:       rule.name,
        category:   rule.category,
        confidence: rule.confidence,
        detail:     "Typical storefront marker in HTML/CSS attributes",
      });
    }
    if (_traceOut) {
      _traceOut.push({
        name: rule.name,
        matched,
        method: matched ? "dom" : "none",
        evidence: matched ? rule.re.source : null,
      });
    }
  }
  return hits;
}

function collectAssetUrlStrings() {
  const urls = [];
  document.querySelectorAll(
    'script[src], link[rel="stylesheet"][href], link[href][rel="stylesheet"], iframe[src]',
  ).forEach((el) => {
    const u = el.src || el.getAttribute("href");
    if (u) urls.push(u);
  });
  return urls;
}

function mergeAppDetections(buckets) {
  const merged = new Map();
  const flat   = ([]).concat(...buckets).filter(Boolean);
  for (const a of flat) {
    const k = String(a.name || "").toLowerCase();
    if (!k) continue;
    const prev = merged.get(k);
    if (!prev || CONF_RANK[a.confidence] > CONF_RANK[prev.confidence]) {
      merged.set(k, { ...a, name: a.name });
    }
  }
  const list = [...merged.values()];
  list.sort((a, b) => {
    const cr = CONF_RANK[b.confidence] - CONF_RANK[a.confidence];
    if (cr !== 0) return cr;
    return String(a.category || "").localeCompare(String(b.category || ""));
  });
  return list;
}

function detectAppsWithTrace() {
  const html     = document.documentElement.outerHTML;
  const bundle   = `${html}\n${collectAssetUrlStrings().join("\n")}`;
  const fromHtml = detectAppsFromSignatures(html);
  const keys     = new Set(fromHtml.map((x) => x.name.toLowerCase()));
  const fromUrls = [];
  for (const app of APP_SIGNATURES) {
    const key = app.name.toLowerCase();
    if (keys.has(key)) continue;
    for (const pattern of app.patterns) {
      if (pattern.test(bundle)) {
        keys.add(key);
        fromUrls.push({
          name:           app.name,
          category:       app.category,
          matchedPattern: pattern.source,
          confidence:     "confirmed",
          detail:         "Matched in storefront script or stylesheet URL",
        });
        break;
      }
    }
  }
  const markerHits = detectAppsFromMarkers(html);
  const apps = mergeAppDetections([[...fromHtml, ...fromUrls], markerHits]);

  const shopPay = detectShopPayStrict();
  if (shopPay.matched) {
    apps.unshift({
      name: "Shop Pay",
      category: "Payments",
      confidence: "confirmed",
      detail: shopPay.evidence || "Shop Pay checkout surface detected",
    });
  }

  const appDetectionTrace = [{ name: "Shop Pay", ...shopPay }];
  for (const app of apps) {
    if (app.name === "Shop Pay") continue;
    appDetectionTrace.push({
      name: app.name,
      matched: true,
      method: "none",
      evidence: app.matchedPattern || app.detail || null,
    });
  }

  return { apps, appDetectionTrace };
}

function detectApps() {
  return detectAppsWithTrace().apps;
}

function formatDetectionTrace(result) {
  if (!result) return "No detection result.";
  const lines = [
    "DETECTION TRACE",
    "",
    `Confidence: ${result.confidence || "none"}`,
    `Score: ${result.score ?? 0}`,
    "",
    "Signals:",
  ];

  const sig = result.signals || {};
  const signalOrder = [
    "shopify_global",
    "shopify_analytics",
    "shopify_routes",
    "meta_generator",
    "cdn_reference",
    "monorail_endpoint",
  ];
  for (const key of signalOrder) {
    const row = sig[key] || { matched: false, value: null };
    let valueStr = dashVal(row.value);
    if (key === "meta_generator" && row.value) valueStr = `"${row.value}"`;
    if (key === "cdn_reference" && row.matched && row.value) valueStr = `first match: ${row.value}`;
    if (key === "monorail_endpoint" && row.matched && row.value) valueStr = `observed call: ${row.value}`;
    lines.push(`  ${key}: matched=${!!row.matched}, value=${valueStr}`);
  }

  const ep = result.productsEndpoint || {};
  lines.push(
    "",
    "/products.json:",
    `  status: ${ep.status ?? "—"}`,
    `  shape_valid: ${!!ep.shape_valid}`,
    `  error: ${dashVal(ep.error)}`,
    "",
    "App detection trace:",
  );

  const appTrace = result.appDetectionTrace || [];
  if (!appTrace.length) {
    lines.push("  (none matched)");
  } else {
    for (const row of appTrace) {
      lines.push(
        `  ${row.name}: matched=${!!row.matched}, method=${row.method || "none"}, evidence=${dashVal(row.evidence)}`,
      );
    }
  }

  return lines.join("\n");
}

window.__makerpeekFormatDetectionTrace = formatDetectionTrace;

// ─── Main IIFE - kicks off detection and sets window.__makerpeekData ──────────

(async function () {
  const result = await detectShopify();
  if (result.confidence === "confirmed") {
    window.__makerpeekData = result;
    document.dispatchEvent(
      new CustomEvent("makerpeek:shopify-detected", { detail: result }),
    );
  }
})();

// ─── Detection - deduped via window._mpDetectPromise ─────────────────────────

async function detectShopify() {
  if (window.__makerpeekDetected) return window.__makerpeekDetected;
  if (window._mpDetectPromise) return window._mpDetectPromise;

  window._mpDetectPromise = (async () => {
    const signalMap = collectShopifySignals();
    const score = scoreShopifySignals(signalMap);

    let productsEndpointWorks = false;
    let productsEndpointStatus = null;
    let productsEndpointError = null;
    let shapeValid = false;

    try {
      const res = await fetch(`${location.origin}/products.json?limit=1`, {
        credentials: "omit",
        headers: { Accept: "application/json" },
      });
      productsEndpointStatus = res.status;
      if (res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("json")) {
          const data = await res.json();
          shapeValid = isValidShopifyProductsPayload(data);
          productsEndpointWorks = shapeValid;
        }
      }
    } catch (e) {
      productsEndpointError = e.message;
    }

    const confidence = resolveShopifyConfidence(score, {
      shape_valid: shapeValid,
      status: productsEndpointStatus,
    });

    const { apps, appDetectionTrace } = detectAppsWithTrace();
    const theme = confidence === "none" ? null : detectTheme();

    const result = {
      confidence,
      score,
      isShopify: confidence === "confirmed",
      storeDomain: confidence === "none" ? null : location.host,
      theme,
      apps,
      appDetectionTrace,
      signals: signalMap,
      productsEndpoint: {
        works: productsEndpointWorks,
        shape_valid: shapeValid,
        status: productsEndpointStatus,
        error: productsEndpointError,
      },
    };

    window.__makerpeekDetected = result;
    return result;
  })();

  return window._mpDetectPromise;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Reasons a theme candidate is not shopper-facing enough to display */
function shouldRejectThemeName(raw) {
  const s = String(raw || "").trim();
  if (!s) return "empty";
  if (/^rc-cm-\d{4}-/i.test(s)) return "Shopify clone / backup theme id";
  if (/^backup[-_]/i.test(s)) return "backup theme prefix";
  if (/_backup[-_]/i.test(s)) return "backup theme suffix";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return "ISO date theme id";
  if (/\bdraft\b/i.test(s)) return "draft theme";
  return null;
}

function normalizeThemeCandidate(val) {
  if (typeof val !== "string") return "";
  return val.replace(/\u00a0/g, " ").trim();
}

function extractThemeNameFromInlineScripts() {
  /** Prefers Shopify inline JSON `{ "theme": { ... "name": "…" } }` blocks */
  const re =
    /"theme"\s*:\s*\{[\s\S]*?"name"\s*:\s*"([^"]+)"/;
  for (const s of document.querySelectorAll("script")) {
    const t = s.textContent || "";
    const m =
      t.match(re)
      || t.match(/Shopify\.theme\s*=\s*\{[\s\S]*?"name"\s*:\s*"([^"]+)"/);
    if (m?.[1]) return normalizeThemeCandidate(m[1]);
  }
  return "";
}

function detectTheme() {
  const role =
    typeof window.Shopify?.theme?.role === "string" && window.Shopify.theme.role.trim()
      ? window.Shopify.theme.role.trim()
      : null;

  const fromShopifyTheme = normalizeThemeCandidate(window.Shopify?.theme?.name);
  const fromAnalytics =
    normalizeThemeCandidate(window.ShopifyAnalytics?.meta?.themeName)
    || normalizeThemeCandidate(window.ShopifyAnalytics?.meta?.theme_name);
  const parsedFromScript = extractThemeNameFromInlineScripts();

  /**
   * @param {string} raw
   * @param {string} sourceLabel
   * @returns {{ name: string; source: string } | null}
   */
  function tryCandidate(raw, sourceLabel) {
    const n = normalizeThemeCandidate(raw);
    if (!n) return null;
    const why = shouldRejectThemeName(n);
    if (why) {
      rejectAttempts.push(`${sourceLabel}: rejected (${why}) → "${n}"`);
      return null;
    }
    return { name: n, source: sourceLabel };
  }

  const rejectAttempts = /** @type {string[]} */ ([]);

  const chain = [
    { label: "Shopify.theme.name", val: fromShopifyTheme },
    { label: "ShopifyAnalytics.meta.themeName", val: fromAnalytics },
    { label: 'inline scripts ("theme"."name")', val: parsedFromScript },
  ];

  /** @type {{ name: string; source: string } | null} */
  let picked = null;
  for (const step of chain) {
    const row = tryCandidate(step.val, step.label);
    if (row) {
      picked = row;
      break;
    }
  }

  const themeName = picked?.name ?? "Custom or unknown theme";
  const chosenSource = picked ? picked.source : null;

  
  const sources = [];
  if (picked) sources.push(picked.source);
  else {
    sources.push("No merchant-facing name cleared the rejection rules");
    if (role?.trim()) sources.push(`Theme role signal: ${role.trim()}`);
  }

  const displayTrim =
    typeof themeName === "string" && themeName.trim()
      ? themeName.trim()
      : "Custom or unknown theme";

  return {
    displayName: displayTrim,
    role,
    chosenSource,
    parsedFromScript: parsedFromScript || null,
    sources: sources.join(" · "),
  };
}
