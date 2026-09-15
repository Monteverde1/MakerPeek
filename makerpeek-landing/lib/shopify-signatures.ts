/**
 * App detection signatures — COPIED from extension/content/detector.js.
 *
 * The extension is the source of truth. If you add a signature there, copy it
 * here too, or the web tool and the extension will disagree about the same
 * store. Regenerate with the snippet in lib/README-signatures.md.
 */

export type AppSignature = {
  name: string;
  category: string;
  patterns: RegExp[];
};

export type Confidence = "confirmed" | "likely" | "possible";

export type AppMarkerRule = {
  name: string;
  category: string;
  re: RegExp;
  confidence: Confidence;
};

export const APP_SIGNATURES: AppSignature[] = [
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

export const DOM_APP_MARKER_RULES: AppMarkerRule[] = [
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
