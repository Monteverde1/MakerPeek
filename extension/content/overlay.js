// PRICING: $11/mo or $99/yr (save $33 = 25% off)
// Chrome Web Store listing (update in dev console when publishing):
//   Name: MakerPeek: Shopify store research
//   Short description: (see manifest.json description)

// MakerPeek - Overlay (Shadow DOM panel + toggle button)

const MP = {
  FOREST:      "#3D5944",
  FOREST_DARK: "#2A3F31",
  CREAM:       "#FBF7F2",
  CREAM_DARK:  "#F4ECE0",
  INK:         "#1A1814",
  INK_SOFT:    "#6B6358",
  BEIGE:       "#E8E0D5",
  WHITE:       "#FFFFFF",
  GOLD:        "#C49B3A",
  RED:         "#B85450",
  FREE_LIMIT:  5,
  FREE_BESTSELLERS_CAP: 3,
  BESTSELLERS_COLLAPSED_VISIBLE: 5,
};

/** Storefront catalog pagination (/products.json) */
const PRODUCTS_PAGE_SIZE           = 250;
const PRODUCTS_MAX_PAGES          = 10;
const PRODUCTS_PER_PAGE_TIMEOUT_MS = 7000;
const PRODUCTS_FETCH_CAP          = 2500;

let panelOpen         = false;
let shadowRoot        = null;
let panelEl           = null;
let dataCache         = null;   // processed stats
let productsCache           = null;   // Dedup /products.json (CSV, snapshots, raw rows)
let productsGroupedCache    = null;   // Map<groupKey, Product[]> aligned with headline counts
let proCache          = null;   // { paid, source }
let usageCache        = null;   // { count, limit, paid }
let auditCache        = null;   // Footer + pagination/dedup diagnostics (not surfaced as raw SKU counts)
let detectionData     = null;
let _pendingPanelOpen = false;  // true when panel opened before detection finished
let cadenceMode       = 'recent'; // 'recent' | 'lifetime' - reset on each new store load
/** Pro app stack: collapsed shows top 5; expand reveals full unified list */
let mpAppsStackExpanded = false;
let diffCache         = null;   // computeDiff result for "Changes since last visit"
let watchlistCache    = null;   // { watching: boolean } - Pro watchlist state for current store
/** @type {{ source: string, truncated?: boolean, totalCatalog?: number|null, reliablePrices?: boolean, error?: string|null } | null} */
let catalogSourceCache = null;
/** Dev footer bar hidden for screenshots; tier still switchable via shortcuts */
let devToggleUiHidden = false;
let devShortcutBound  = false;
/** Set when Store profile theme HTML is rendered; used by expand/collapse control */
let themeProfileUICache = null;
/** @type {null|'loading'|'hidden'|object[]} */
let bestsellersCache = null;

function isConfirmedShopify(data) {
  return data?.confidence === "confirmed" || !!data?.isShopify;
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function getMountInsertionTarget() {
  return document.body || document.documentElement || document.querySelector("html") || null;
}

/** Injects shadow host + floating M + panel. */
function mountFloatingButton() {
  try {
    if (document.getElementById("makerpeek-root")) {
      return true;
    }

    const target = getMountInsertionTarget();
    if (!target) {
      return false;
    }

    shadowRoot = null;
    panelEl = null;
    panelOpen = false;

    const host = document.createElement("div");
    host.id = "makerpeek-root";
    host.setAttribute("data-makerpeek-trigger", "1");
    host.setAttribute("style", [
      "all: initial !important",
      "position: fixed !important",
      "inset: 0 !important",
      "width: 100% !important",
      "height: 100% !important",
      "z-index: 2147483647 !important",
      "pointer-events: none !important",
      "overflow: visible !important",
      "background: transparent !important",
    ].join("; ") + ";");
    target.appendChild(host);

    shadowRoot = host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = buildCSS();
    shadowRoot.appendChild(style);

    const toggleBtn = document.createElement("button");
    toggleBtn.id = "mp-toggle";
    toggleBtn.setAttribute("aria-label", "Toggle MakerPeek panel");
    toggleBtn.innerHTML = `<span class="mp-m">M</span>`;
    toggleBtn.addEventListener("click", onToggle);
    shadowRoot.appendChild(toggleBtn);

    panelEl = document.createElement("div");
    panelEl.id = "mp-panel";
    panelEl.setAttribute("role", "complementary");
    panelEl.setAttribute("aria-label", "MakerPeek store analysis");
    shadowRoot.appendChild(panelEl);

    const sharedTip = document.createElement("div");
    sharedTip.id = "mp-shared-tooltip";
    sharedTip.className = "mp-proof-tip";
    sharedTip.setAttribute("role", "tooltip");
    sharedTip.hidden = true;
    shadowRoot.appendChild(sharedTip);

    shadowRoot.addEventListener("click", (e) => {
      const tip = shadowRoot.getElementById("mp-shared-tooltip");
      if (!tip || tip.hidden) return;
      if (!e.target.closest(".mp-proof-btn") && !e.target.closest("#mp-shared-tooltip")) {
        tip.hidden = true;
      }
    });

    setupDevToggleShortcuts();
    void loadDevToggleUiHidden().then(async () => {
      proCache = await getProStatusFromBg();
      renderPanel("idle");
    });

    startFloatingButtonGuard();
    return true;
  } catch (_e) {
    return false;
  }
}

function injectUI() {
  return mountFloatingButton();
}

let _mpMountObserver = null;

function startFloatingButtonGuard() {
  if (_mpMountObserver) return;
  const root = document.documentElement;
  if (!root) return;
  _mpMountObserver = new MutationObserver(() => {
    if (!document.getElementById("makerpeek-root")) {
      mountFloatingButton();
    }
  });
  _mpMountObserver.observe(root, { childList: true, subtree: true });
}

async function mountMakerpeekUI() {
  if (document.getElementById("makerpeek-root") && shadowRoot?.getElementById("mp-toggle")) {
    return true;
  }
  return mountFloatingButton();
}

async function ensureMakerpeekReady() {
  detectionData = await resolveDetection();
  if (!isConfirmedShopify(detectionData)) return false;
  return mountMakerpeekUI();
}

// ─── Toggle / open / route ────────────────────────────────────────────────────

function onToggle() {
  panelOpen = !panelOpen;
  panelEl.classList.toggle("open", panelOpen);
  if (panelOpen && !dataCache) routePanel();
}

function openPanel() {
  if (!panelEl) return;
  panelOpen = true;
  panelEl.classList.add("open");
  if (!dataCache) routePanel();
}

function routePanel() {
  if (!detectionData) {
    // Detection still in progress - show loading and re-route when done
    _pendingPanelOpen = true;
    renderPanel("loading", null, "Detecting store…");
    return;
  }
  if (isConfirmedShopify(detectionData)) {
    fetchAndRender();
  } else {
    renderPanel("not-shopify");
  }
}

// ─── Pro helpers ──────────────────────────────────────────────────────────────

function getProStatusFromBg() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_PRO_STATUS" }, (res) => {
      if (chrome.runtime.lastError || !res) resolve({ paid: false });
      else resolve(res);
    });
  });
}

async function loadDevToggleUiHidden() {
  const stored = await chrome.storage.local.get("devToggleUiHidden");
  devToggleUiHidden = !!stored.devToggleUiHidden;
}

async function setDevToggleUiHidden(hidden) {
  devToggleUiHidden = !!hidden;
  await chrome.storage.local.set({ devToggleUiHidden });
}

async function isDevModeActive() {
  const status = proCache || await getProStatusFromBg();
  return status?.source === "dev_override";
}

/** Mirrors lib/pro.js isPro() - content scripts cannot import the module. */
function isPro() {
  return !!(proCache?.paid);
}

async function applyDevProOverride(paid) {
  await chrome.storage.local.set({ devProOverride: paid });
  proCache = await getProStatusFromBg();
  if (dataCache) renderPanel("loaded");
  else if (isConfirmedShopify(detectionData)) renderPanel("idle");
}

function setupDevToggleShortcuts() {
  if (devShortcutBound) return;
  devShortcutBound = true;

  let brandClickCount = 0;
  let brandClickTimer = null;

  document.addEventListener("keydown", async (e) => {
    if (!e.altKey || !e.shiftKey) return;
    const key = e.key.toLowerCase();
    if (key !== "d" && key !== "p") return;
    if (!(await isDevModeActive())) return;
    e.preventDefault();

    if (key === "d") {
      await setDevToggleUiHidden(!devToggleUiHidden);
      showToast(devToggleUiHidden ? "Dev bar hidden" : "Dev bar shown");
      if (dataCache) renderPanel("loaded");
      else if (isConfirmedShopify(detectionData)) renderPanel("idle");
      return;
    }

    const next = !(proCache?.paid ?? false);
    await applyDevProOverride(next);
    showToast(next ? "Dev: Pro ON" : "Dev: Free");
  });

  if (shadowRoot) {
    shadowRoot.addEventListener("click", (e) => {
      const brand = e.target.closest?.(".mp-brand");
      if (!brand) return;
      if (!devToggleUiHidden) return;

      brandClickCount += 1;
      clearTimeout(brandClickTimer);
      brandClickTimer = setTimeout(() => { brandClickCount = 0; }, 500);
      if (brandClickCount < 3) return;
      brandClickCount = 0;
      void setDevToggleUiHidden(false).then(() => {
        showToast("Dev bar shown");
        if (dataCache) renderPanel("loaded");
        else if (isConfirmedShopify(detectionData)) renderPanel("idle");
      });
    });
  }
}

function getUsageFromBg() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_USAGE" }, (res) => {
      if (chrome.runtime.lastError || !res)
        resolve({ count: 0, limit: MP.FREE_LIMIT, paid: false });
      else resolve(res);
    });
  });
}

function sendUpgrade(feature) {
    chrome.runtime.sendMessage({ type: "OPEN_UPGRADE" }, () => void chrome.runtime.lastError);
}

function sendWatchlistMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (res) => {
      if (chrome.runtime.lastError) resolve(null);
      else resolve(res);
    });
  });
}

function showToast(text) {
  if (!shadowRoot) return;
  const existing = shadowRoot.getElementById("mp-toast");
  if (existing) existing.remove();
  const toast = document.createElement("div");
  toast.id = "mp-toast";
  toast.className = "mp-toast";
  toast.textContent = text;
  shadowRoot.appendChild(toast);
  // Trigger enter animation
  requestAnimationFrame(() => toast.classList.add("mp-toast--visible"));
  setTimeout(() => {
    toast.classList.remove("mp-toast--visible");
    setTimeout(() => toast.remove(), 300);
  }, 2500);
}

// ─── Currency + shipping detection ───────────────────────────────────────────

function detectCurrency() {
  // 1. Shopify globals
  if (typeof Shopify !== "undefined") {
    if (Shopify.currency?.active) return { code: Shopify.currency.active, source: "Shopify.currency.active" };
  }
  if (typeof ShopifyAnalytics !== "undefined" && ShopifyAnalytics.meta?.currency) {
    return { code: ShopifyAnalytics.meta.currency, source: "ShopifyAnalytics.meta.currency" };
  }
  // 2. JSON-LD structured data
  for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      const data  = JSON.parse(s.textContent);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        for (const o of [].concat(item.offers || [])) {
          if (o.priceCurrency) return { code: o.priceCurrency, source: "JSON-LD structured data" };
        }
      }
    } catch (_) {}
  }
  // 3. Meta tags
  const meta = document.querySelector('meta[property="og:price:currency"]')?.content
             || document.querySelector('meta[itemprop="priceCurrency"]')?.content;
  if (meta) return { code: meta, source: "meta tag" };
  // 4. TLD heuristic
  const tld = location.hostname.split(".").pop().toLowerCase();
  const TLD_MAP = { ca: "CAD", uk: "GBP", au: "AUD", nz: "NZD", ie: "EUR", de: "EUR", fr: "EUR", it: "EUR", es: "EUR", nl: "EUR", jp: "JPY", in: "INR", mx: "MXN", br: "BRL", za: "ZAR" };
  if (TLD_MAP[tld]) return { code: TLD_MAP[tld], source: `inferred from .${tld} TLD` };
  return { code: "USD", source: "default fallback" };
}

// ─── Product grouping (same item, many colors collapses via computeStyleKey)

let STYLE_KEY_SAMPLE_LOG_COUNTER = 0;

const COLOR_EXTRA = [
  "onyx",
  "acai",
  "mist",
  "blizzard",
  "fog",
  "haze",
  "dust",
  "bone",
  "shell",
  "clay",
  "terracotta",
  "ochre",
  "saffron",
  "paprika",
  "cardinal",
  "ruby",
  "magenta",
  "fuschia",
  "fuchsia",
  "violet",
  "mulberry",
  "eggplant",
  "aubergine",
  "periwinkle",
  "sapphire",
  "ocean",
  "sky",
  "storm",
  "thunder",
  "shadow",
  "soot",
  "jet",
  "raven",
  "ebony",
  "snow",
  "cloud",
  "frost",
  "champagne",
  "butter",
  "honey",
  "amber",
  "cinnamon",
  "brick",
  "mahogany",
  "walnut",
  "hazelnut",
  "ginger",
  "juniper",
  "fern",
  "pine",
  "evergreen",
  "ivy",
  "seafoam",
  "lagoon",
  "lake",
  "river",
  "dune",
  "pebble",
  "granite",
  "marble",
];

/** Words that precede poetic color names (“Heathered Onyx”). */
const COLOR_MODIFIER_WORDS = new Set([
  "heathered",
  "marled",
  "washed",
  "faded",
  "brushed",
  "dusty",
  "soft",
  "deep",
  "light",
  "dark",
  "muted",
  "warm",
  "cool",
  "pale",
  "bright",
  "classic",
  "vintage",
  "neon",
  "pastel",
  "raw",
  "natural",
  "jet",
  "burnt",
  "calm",
]);

const COLOR_WORDS = new Set([
  "black",
  "white",
  "navy",
  "grey",
  "gray",
  "blue",
  "red",
  "green",
  "brown",
  "tan",
  "beige",
  "charcoal",
  "ivory",
  "natural",
  "cream",
  "pink",
  "purple",
  "orange",
  "yellow",
  "olive",
  "sand",
  "stone",
  "rust",
  "wine",
  "burgundy",
  "khaki",
  "camel",
  "oat",
  "oatmeal",
  "blush",
  "rose",
  "coral",
  "mint",
  "sage",
  "forest",
  "royal",
  "cobalt",
  "crimson",
  "scarlet",
  "jade",
  "teal",
  "aqua",
  "turquoise",
  "silver",
  "gold",
  "bronze",
  "copper",
  "platinum",
  "pearl",
  "smoke",
  "ash",
  "slate",
  "denim",
  "indigo",
  "plum",
  "mauve",
  "lilac",
  "lavender",
  "peach",
  "apricot",
  "salmon",
  "mocha",
  "chocolate",
  "espresso",
  "caramel",
  "toffee",
  "almond",
  "vanilla",
  "pacific",
  "mist",
  "dusk",
  "dawn",
  "sunset",
  "sunrise",
  "midnight",
  "glacier",
  "arctic",
  "tropical",
  "autumn",
  "winter",
  "summer",
  "spring",
  "multi",
  "two-tone",
  "tonal",
  "heather",
  "marled",
  "speckled",
  ...COLOR_EXTRA,
]);

const COLOR_OR_MODIFIER_WORDS = new Set([...COLOR_WORDS, ...COLOR_MODIFIER_WORDS]);
const STYLE_SEPARATORS = /\s*[-\u2013\u2014|·•:]\s*/;
const STYLE_PAREN_BLOCK = /\s*\([^)]*\)\s*/g;
const STYLE_BRACKET_BLOCK = /\s*\[[^\]]*\]\s*/g;
const STYLE_WHITESPACE = /\s+/g;

function segmentFullyPoeticTail(seg) {
  const w = seg.trim().split(STYLE_WHITESPACE).filter(Boolean);
  if (!w.length || w.length > 3) return false;
  return w.every((tok) => COLOR_OR_MODIFIER_WORDS.has(tok));
}

function computeStyleKey(product) {
  const rawTitle   = product.title || "";
  const hadSepFlag = STYLE_SEPARATORS.test(rawTitle);
  let title        = rawTitle.toLowerCase();

  title = title.replace(STYLE_PAREN_BLOCK, " ").replace(STYLE_BRACKET_BLOCK, " ");

  const chunks = title.split(STYLE_SEPARATORS).map((s) => s.trim()).filter(Boolean);
  while (chunks.length >= 2 && segmentFullyPoeticTail(chunks[chunks.length - 1])) chunks.pop();

  let base;
  if (chunks.length >= 2) base = chunks.slice(0, -1).join(" ");
  else base = chunks[0] || title;

  const tokens = base.split(STYLE_WHITESPACE).filter(Boolean);
  while (tokens.length > 1 && COLOR_WORDS.has(tokens[tokens.length - 1])) tokens.pop();
  while (tokens.length > 2 && COLOR_WORDS.has(tokens[0])) tokens.shift();

  while (tokens.length > 1 && COLOR_MODIFIER_WORDS.has(tokens[tokens.length - 1]))
    tokens.pop();
  while (tokens.length > 2 && COLOR_MODIFIER_WORDS.has(tokens[0]))
    tokens.shift();

  base = tokens.join(" ").replace(STYLE_WHITESPACE, " ").trim();

  if (base.length < 3) {
    base = `${(product.product_type || "")} ${chunks[0] || ""}`.trim().toLowerCase();
  }

  const styleKey = base;
  if (hadSepFlag) {
    STYLE_KEY_SAMPLE_LOG_COUNTER += 1;
  }

  return styleKey;
}

/** @returns {Map<string, *>} */
function groupByStyle(products) {
  const groups = new Map();
  for (const p of products) {
    const key = computeStyleKey(p);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return groups;
}

function logStyleGroupingDiagnostic(_catalogProducts, _groups) {
  /* no-op; hook kept for optional debug */
}

function cheapestListingPriceInGroup(productsArr) {
  let minPx = NaN;
  for (const p of productsArr) {
    const v = parseFloat(p.variants?.[0]?.price);
    if (!Number.isNaN(v) && v > 0 && (Number.isNaN(minPx) || v < minPx)) minPx = v;
  }
  return minPx;
}

function groupIsFullyOos(productsArr) {
  if (!productsArr.length) return false;
  for (const p of productsArr) {
    const variants = p.variants || [];
    const allUnavail =
      variants.length > 0 && variants.every((v) => v.available === false);
    if (!allUnavail) return false;
  }
  return true;
}

/** Per calendar month `YYYY-MM`, count grouped products keyed to earliest Shopify row timestamp in-group. */
function buildStyleMonthlyLaunchBuckets(groups) {
  const buckets = /** @type {Map<string, number>} */ (new Map());
  for (const prods of groups.values()) {
    let minTs = Infinity;
    for (const p of prods) {
      const raw = p.created_at || p.published_at;
      const t = raw ? new Date(raw).getTime() : NaN;
      if (!Number.isNaN(t) && t < minTs) minTs = t;
    }
    if (minTs === Infinity) continue;
    const ym = new Date(minTs).toISOString().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) continue;
    buckets.set(ym, (buckets.get(ym) || 0) + 1);
  }
  return buckets;
}

function buildCadenceBarsFromMonthlyCounts(buckets, mode = 'recent') {
  if (!buckets?.size) return { bars: [] };

  let oldestKey = /** @type {string | null} */ (null);
  for (const k of buckets.keys()) {
    if (!oldestKey || k < oldestKey) oldestKey = k;
  }

  const now        = new Date();
  const mkKey      = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const currentKey = mkKey(now);

  if (mode === "recent") {
    const bars = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      bars.push({ month: mkKey(d), count: buckets.get(mkKey(d)) || 0 });
    }
    return { bars };
  }

  const bars  = [];
  const [oy, om] = oldestKey.split("-").map(Number);
  const cursor   = new Date(oy, om - 1, 1);
  const endDate  = new Date(now.getFullYear(), now.getMonth(), 1);
  while (cursor <= endDate) {
    const key = mkKey(cursor);
    bars.push({ month: key, count: buckets.get(key) || 0 });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return { bars };
}

function computePriceBucketsFromPrices(priceList) {
  const prices = priceList.filter((p) => !Number.isNaN(p) && p > 0);
  if (!prices.length) return [];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  if (min === max) return [{ range: [min, max], count: prices.length }];
  const bucketSize = (max - min) / 6;
  const buckets = Array.from({ length: 6 }, (_, i) => ({
    range: [min + i * bucketSize, min + (i + 1) * bucketSize],
    count: 0,
  }));
  for (const p of prices) {
    const idx = Math.min(5, Math.floor((p - min) / bucketSize));
    buckets[idx].count++;
  }
  return buckets;
}


function renderBlockedBanner() {
  return `<div class="mp-blocked-banner">
    <div class="mp-blocked-icon">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="11" width="18" height="11" rx="2"/>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    </div>
    <div class="mp-blocked-text">
      <div class="mp-blocked-title">Catalog access restricted</div>
      <div class="mp-blocked-body">This Shopify store blocks public catalog data. MakerPeek tells you when this happens instead of guessing. Theme and app stack below are still verified.</div>
    </div>
  </div>`;
}


function computePriceDistribution(products) {
  const buckets = [
    { label: "$0-$25", min: 0, max: 25, count: 0 },
    { label: "$25-$50", min: 25, max: 50, count: 0 },
    { label: "$50-$100", min: 50, max: 100, count: 0 },
    { label: "$100-$250", min: 100, max: 250, count: 0 },
    { label: "$250+", min: 250, max: Infinity, count: 0 },
  ];

  for (const product of products || []) {
    const prices = (product.variants || [])
      .map((v) => parseFloat(v.price))
      .filter((p) => !isNaN(p));
    if (prices.length === 0) continue;
    const price = Math.min(...prices);
    for (const bucket of buckets) {
      if (price >= bucket.min && price < bucket.max) {
        bucket.count++;
        break;
      }
    }
  }
  const max = Math.max(...buckets.map((b) => b.count), 1);
  return buckets.map((b) => ({ ...b, pct: (b.count / max) * 100 }));
}

function renderPricingDistributionSection(distribution) {
  if (!distribution || !distribution.length) return "";
  return `
    <div class="mp-section">
      <div class="mp-section-title">Pricing distribution ${proofIcon("pricing_distribution")}</div>
      <div class="mp-price-bars">
        ${distribution
          .map(
            (b) => `
          <div class="mp-price-bar-row">
            <span class="mp-price-bar-label">${escHtml(b.label)}</span>
            <div class="mp-price-bar-track">
              <div class="mp-price-bar-fill" style="width: ${b.pct}%"></div>
            </div>
            <span class="mp-price-bar-count">${b.count}</span>
          </div>`,
          )
          .join("")}
      </div>
    </div>`;
}

function renderBestsellersSectionHTML(bestsellers, _isProUser, origin, mode) {
  if (mode === "hidden") return "";
  if (mode === "loading") {
    return `
      <div class="mp-section" data-section="bestsellers">
        <div class="mp-section-title">Bestsellers ${proofIcon("bestsellers")}</div>
        <p class="mp-section-subhead">From Shopify's best-selling sort. Real sales rank, not estimated.</p>
        <p class="mp-sub">Loading bestsellers…</p>
      </div>`;
  }
  const list = bestsellers || [];
  if (!list.length) return "";
  const storeOrigin = origin || location.origin;
  const canCollapse = list.length > MP.BESTSELLERS_COLLAPSED_VISIBLE;
  const listClass = canCollapse
    ? "mp-bestsellers-list mp-bestsellers--collapsed"
    : "mp-bestsellers-list";
  const rowsHtml = list
    .map((b) => {
      const href = `${storeOrigin}/products/${encodeURIComponent(b.handle)}`;
      const priceStr = b.price != null ? `$${b.price.toFixed(2)}` : "n/a";
      const compareStr =
        b.onSale && b.compareAtPrice != null
          ? `<s class="mp-bestseller-compare">$${b.compareAtPrice.toFixed(2)}</s>`
          : "";
      return `
          <li>
            <a href="${escHtml(href)}" target="_blank" rel="noopener noreferrer" class="mp-bestseller-row">
              <span class="mp-bestseller-rank">${b.rank}</span>
              <div class="mp-bestseller-main">
                <span class="mp-bestseller-title">${escHtml(b.title)}</span>
                <span class="mp-bestseller-price">${priceStr}${compareStr}</span>
              </div>
              <svg class="mp-bestseller-arrow" viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M7 17L17 7M17 7H8M17 7v9"/>
              </svg>
            </a>
          </li>`;
    })
    .join("");
  const toggleHtml = canCollapse
    ? `<button type="button" class="mp-bestsellers-toggle" data-total="${list.length}" aria-expanded="false">Show all ${list.length}</button>`
    : "";
  return `
    <div class="mp-section" data-section="bestsellers">
      <div class="mp-section-title">Bestsellers ${proofIcon("bestsellers")}</div>
      <p class="mp-section-subhead">From Shopify's best-selling sort. Real sales rank, not estimated.</p>
      <ol class="${listClass}">${rowsHtml}</ol>
      ${toggleHtml}
    </div>`;
}

function wireBestsellersCollapseToggle(root) {
  const list = root?.querySelector(".mp-bestsellers-list");
  const btn = root?.querySelector(".mp-bestsellers-toggle");
  if (!list || !btn) return;

  const total = parseInt(btn.dataset.total, 10) || list.querySelectorAll("li").length;

  const setCollapsed = (collapsed) => {
    list.classList.toggle("mp-bestsellers--collapsed", collapsed);
    btn.textContent = collapsed ? `Show all ${total}` : "Show fewer";
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
  };

  setCollapsed(true);
  btn.addEventListener("click", () => {
    setCollapsed(!list.classList.contains("mp-bestsellers--collapsed"));
  });
}

function renderAppStackSection(appStack, isProUser) {
  const inferredApps = inferApps(dataCache || {}, appStack || []);
  const unified = mergeDetectedAndHintedApps(appStack || [], inferredApps);
  const allCategorized = categorizeAppStack(unified);
  const visibleCategorized = isProUser ? allCategorized : limitForFree(allCategorized, 3);

  const totalApps = unified.length;
  const shownApps = visibleCategorized.reduce((sum, cat) => sum + cat.apps.length, 0);
  const hiddenApps = totalApps - shownApps;

  if (totalApps === 0) {
    return `
      <div class="mp-section">
        <div class="mp-section-title">App stack ${proofIcon("appStack")}</div>
        <p class="mp-sub mp-app-empty">No storefront-linked apps surfaced yet.</p>
      </div>`;
  }

  return `
    <div class="mp-section">
      <div class="mp-section-title">App stack ${proofIcon("appStack")}</div>
      ${visibleCategorized
        .map(
          (cat) => `
        <div class="mp-app-category">
          <div class="mp-app-category-label">${escHtml(cat.label)}</div>
          <ul class="mp-app-list">
            ${cat.apps
              .map(
                (app) => `
              <li class="mp-app-row">
                <span class="mp-app-name">${escHtml(app.name || app.id)}</span>
                ${confidenceBadgeHtml(app.confidence || "confirmed")}
              </li>`,
              )
              .join("")}
          </ul>
        </div>`,
        )
        .join("")}
      ${
        !isProUser && hiddenApps > 0
          ? `<div class="mp-upsell">
        +${hiddenApps} more apps. <a href="#" class="mp-upgrade" data-source="app_stack">See full stack (Pro $11/mo)</a>
      </div>`
          : ""
      }
    </div>`;
}

function updateBestsellersSection(bestsellers, origin, isProUser) {
  if (!panelEl) return;
  const slot = panelEl.querySelector('[data-section="bestsellers"]');
  const html = renderBestsellersSectionHTML(bestsellers, isProUser, origin, "data");
  if (slot) {
    const wrap = document.createElement("div");
    wrap.innerHTML = html;
    slot.replaceWith(wrap.firstElementChild);
  } else {
    const body = panelEl.querySelector("#mp-body");
    const maturityTitle = body?.querySelector(".mp-section-title");
    // fallback: re-render full panel
    if (dataCache) renderPanel("loaded");
    return;
  }
  wirePanelUpgradeLinks(panelEl);
  wireBestsellersCollapseToggle(panelEl);
}

function hideBestsellersSection() {
  if (!panelEl) return;
  const slot = panelEl.querySelector('[data-section="bestsellers"]');
  if (slot) slot.remove();
}

function startBestsellersFetch(origin, products) {
  bestsellersCache = "loading";
  fetchBestsellers(origin)
    .then((handles) => {
      const joined = joinBestsellersWithCatalog(handles, products);
      bestsellersCache = joined;
      updateBestsellersSection(joined, origin, isPro());
      logMakerPeekRenderSummary(origin, products, joined);
    })
    .catch((err) => {
            bestsellersCache = "hidden";
      hideBestsellersSection();
      logMakerPeekRenderSummary(origin, products, []);
    });
}

function logMakerPeekRenderSummary(origin, products, bestsellers) {
  try {
    const host = new URL(origin).host;
    const apps = detectionData?.apps || [];
    const inferred = inferApps(dataCache || {}, apps);
    const unified = mergeDetectedAndHintedApps(apps, inferred);
    const cats = categorizeAppStack(unified);
    const bCount = Array.isArray(bestsellers) ? bestsellers.length : 0;
      } catch (e) {
      }
}

function wirePanelUpgradeLinks(root) {
  root.querySelectorAll(".mp-upgrade").forEach((el) => {
    if (el.dataset.mpWired) return;
    el.dataset.mpWired = "1";
    el.addEventListener("click", (e) => {
      e.preventDefault();
      sendUpgrade(el.dataset.source || "pro_feature");
    });
  });
}

function buildBlockedDataCache(catalog) {
  const apps = detectionData?.apps || [];
  const theme = detectionData?.theme?.name
    ? detectionData.theme
    : { name: "Custom or unknown theme", source: "fallback" };
  return {
    blocked: true,
    catalogSource: "blocked",
    products: 0,
    totalVariants: 0,
    priceMin: 0,
    priceMax: 0,
    priceAvg: 0,
    priceMedian: 0,
    priceStdDev: 0,
    newThisMonth: 0,
    onSale: 0,
    outOfStock: 0,
    vendorCount: 0,
    avgVariants: 0,
    avgPerMonth: 0,
    oldestPublishedAt: null,
    promotionIntensity: null,
    digitalCount: 0,
    podCount: 0,
    digitalProductDetails: [],
    podProductDetails: [],
    capped: false,
    catalogProductCount: 0,
    catalogTruncated: false,
    catalogTotal: null,
    reliablePrices: false,
    catalogBlockedMessage: catalog.error,
    theme,
    apps,
    diff: null,
    tagAnalysis: [],
  };
}

function catalogLoadingMessage(meta) {
  if (!meta) return "Loading catalog…";
  if (meta.phase === "products" && meta.page > 1) {
    return `Loading page ${meta.page}…`;
  }
  return "Loading catalog…";
}

async function fetchAndRender() {
  renderPanel("loading");
  try {
    mpAppsStackExpanded = false;
    bestsellersCache = null;
    const domain = location.host;

    const [catalog, proStatus, usage] = await Promise.all([
      fetchStoreCatalog(location.origin, {
        onProgress(meta) {
          renderPanel("loading", null, catalogLoadingMessage(meta));
        },
      }),
      getProStatusFromBg(),
      getUsageFromBg(),
    ]);

    logCatalogFetch(domain, catalog);

    catalogSourceCache = {
      source: catalog.source,
      truncated: catalog.truncated,
      totalCatalog: catalog.totalCatalog,
      reliablePrices: catalog.reliablePrices,
      error: catalog.error,
    };

    productsCache = catalog.products;
    proCache        = proStatus;
    usageCache      = usage;
    cadenceMode     = "recent";

    if (proStatus.paid) {
      const wlData = await chrome.storage.local.get("watchlist_v1");
      const wl = wlData["watchlist_v1"] || { stores: [] };
      watchlistCache = { watching: wl.stores.some((s) => s.domain === domain) };
    } else {
      watchlistCache = { watching: false };
    }

    if (catalog.source === "blocked") {
      diffCache = null;
      auditCache = {
        fetchedAt: new Date().toISOString(),
        productGroups: 0,
        totalVariants: 0,
        catalogSource: "blocked",
        pageCounts: [],
        rawSum: 0,
        duplicatesRemoved: 0,
        capped: false,
      };
      dataCache = buildBlockedDataCache(catalog);
      bestsellersCache = null;
      renderPanel("loaded");
      logMakerPeekRenderSummary(location.origin, [], []);
      return;
    }

    const catalogProducts = catalog.products;
    const { pageCounts, fetchedAt, capped, errorState } = catalog;

    const THIRTY_MS = 30 * 24 * 60 * 60 * 1000;
    const recentProducts = catalogProducts.filter((p) => {
      const created = p.created_at ? new Date(p.created_at).getTime() : null;
      return created && Date.now() - created < THIRTY_MS;
    });
    recentProducts.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at),
    );
    
    renderPanel("loading", null, "Organizing products…");
    const styleGroups = groupByStyle(catalogProducts);
    productsGroupedCache = styleGroups;

    logStyleGroupingDiagnostic(catalogProducts, styleGroups);

    const stats = computeStats(catalogProducts, styleGroups, detectionData?.apps || [], {
      catalogSource: catalog.source,
      reliablePrices: catalog.reliablePrices,
    });
    const rawSum = pageCounts.reduce((a, b) => a + b, 0);
    const duplicatesRemoved = rawSum - catalogProducts.length;

    auditCache = {
      pageCounts,
      rawSum,
      productGroups: stats.products,
      totalVariants: stats.totalVariants,
      duplicatesRemoved,
      capped,
      fetchedAt,
      catalogSource: catalog.source,
    };

    
    const currentSnap = buildSnapshot(domain, catalogProducts, fetchedAt);
    const prevSnap    = await getPreviousSnapshot(domain);
    diffCache         = computeDiff(prevSnap, currentSnap);
    await persistSnapshot(currentSnap, domain);

    const promotionIntensity = computePromotionIntensity(stats);

    dataCache = processProducts(catalogProducts, capped, stats, {
      catalogProductCount: catalogProducts.length,
    });
    dataCache.catalogSource      = catalog.source;
    dataCache.catalogTruncated   = catalog.truncated;
    dataCache.catalogTotal       = catalog.totalCatalog;
    dataCache.reliablePrices     = catalog.reliablePrices;
    dataCache.diff               = diffCache;
    dataCache.promotionIntensity = promotionIntensity;
    dataCache.productsFetchError = errorState;
    dataCache.priceDistribution = computePriceDistribution(catalogProducts);
    bestsellersCache = "loading";

    renderPanel("loaded");
    logMakerPeekRenderSummary(location.origin, catalogProducts, []);

    if (catalog.source === "bulk_json" && catalogProducts.length > 0) {
      startBestsellersFetch(location.origin, catalogProducts);
    } else {
      bestsellersCache = "hidden";
    }
  } catch (err) {
    renderPanel("error", String(err.message || err));
  }
}

// ─── Data processing ──────────────────────────────────────────────────────────

function processProducts(products, capped, precomputedStats, visibleMeta = {}) {
  const catalogTotal =
    typeof visibleMeta.catalogProductCount === "number"
      ? visibleMeta.catalogProductCount
      : products.length;
  const stats =
    precomputedStats ||
    computeStats(products, groupByStyle(products), detectionData?.apps || []);

  // Currency detection kept for internal/formatting use (not shown as a panel row).
  void detectCurrency();

  return {
    ...stats,
    capped,
    catalogProductCount: catalogTotal,
    tagAnalysis: computeTagAnalysis(products),
  };
}

// ─── Stat helpers ─────────────────────────────────────────────────────────────

function median(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function stdDev(arr) {
  if (arr.length < 2) return 0;
  const mean     = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / arr.length;
  return Math.sqrt(variance);
}

function getStockStatus(product) {
  const variants  = product.variants || [];
  if (!variants.length) return { label: "n/a", state: "unknown" };
  const available = variants.filter((v) => v.available !== false).length;
  if (available === 0) return { label: "OOS", state: "oos" };
  if (available < variants.length)
    return { label: `${available}/${variants.length}`, state: "partial" };
  return { label: "In stock", state: "in" };
}

// ─── Product classification helpers ──────────────────────────────────────────

const POD_APP_NAMES = new Set([
  "Printify", "Printful", "Gooten", "CustomCat", "SPOD", "T-Pop",
  "JetPrint", "Apliiq", "AOP+", "Pillow Profits", "Print Aura",
]);

const DIGITAL_KEYWORDS = /\b(digital|download|pdf|printable|svg|png|epub|template|ebook|instant[- ]?download|presets?|fonts?|stock[- ]?(photo|image))\b/i;
const POD_TITLE_RE     = /\b(aop|all[- ]?over[- ]?print|print[- ]?on[- ]?demand|made[- ]?to[- ]?order|custom[- ]?print|sublimat)\b/i;

function classifyProductDetailed(p, storePodAppNames) {
  const text                 = `${p.title || ""} ${p.tags || ""} ${p.product_type || ""}`;
  const hasNoShipVariant     = p.variants?.some((v) => v.requires_shipping === false);
  const digitalKwMatch       = text.match(DIGITAL_KEYWORDS);
  const isDigital            = !!(digitalKwMatch || hasNoShipVariant);
  const digitalReasons       = [];
  if (digitalKwMatch) digitalReasons.push("Matched digital-download keyword in title, tags, or product type");
  if (hasNoShipVariant) digitalReasons.push("At least one variant does not require shipping");

  const variantCount   = p.variants?.length || 0;
  const hasSize        = p.options?.some((o) => /size/i.test(o.name));
  const hasColor       = p.options?.some((o) => /colou?r/i.test(o.name));
  const podKwMatch     = POD_TITLE_RE.exec(text);
  const podVariantSig  = variantCount >= 15 && hasSize && hasColor;
  const storeHasPodApp = storePodAppNames.length > 0;

  const podReasons = [];
  if (podKwMatch) podReasons.push(`Matched print-on-demand keyword: ${podKwMatch[0].trim()}`);
  if (podVariantSig) podReasons.push(`${variantCount} variants with size and color options`);
  if (storeHasPodApp)
    podReasons.push(
      storePodAppNames.length === 1
        ? `Detected POD app: ${storePodAppNames[0]}`
        : `Detected POD apps: ${storePodAppNames.slice(0, 3).join(", ")}${storePodAppNames.length > 3 ? "…" : ""}`,
    );

  const isPod = !isDigital && !!(podKwMatch || podVariantSig || storeHasPodApp);
  return { isDigital, isPod, digitalReasons, podReasons: isPod ? podReasons : [] };
}

/** @returns {number | null} */
function variantCompareAtSaleDiscountPct(v) {
  const price   = parseFloat(v.price);
  const compare = parseFloat(v.compare_at_price);
  if (compare && price && compare > price) return ((compare - price) / compare) * 100;
  return null;
}

/** One discount % per on-sale product: listing variant if it is on sale, else cheapest on-sale variant */
function representativeProductSaleDiscountPct(p) {
  const variants = p.variants || [];
  if (!variants.length) return null;
  const listingDisc = variantCompareAtSaleDiscountPct(variants[0]);
  if (listingDisc != null) return listingDisc;

  /** @typedef {{ priceNum: number; pct: number }} SalePick */
  /** @type {SalePick | null} */
  let pick = null;
  for (const v of variants) {
    const px  = parseFloat(v.price);
    const pct = variantCompareAtSaleDiscountPct(v);
    if (pct == null || !px || Number.isNaN(px)) continue;
    if (!pick || px < pick.priceNum) pick = { priceNum: px, pct };
  }
  return pick ? pick.pct : null;
}

function clampProductBucketCount(_metricLabel, raw, ceiling) {
  if (raw > ceiling) return ceiling;
  return raw;
}


/**
 * Metrics are keyed per grouped display product (unless noted); SKU totals roll up every Shopify row from `/products.json`.
 * @param {*[]} catalogProducts Dedup `/products.json` rows
 * @param {Map<string, *[]>} styleGroupsMap computeStyleKey → product[]
 */
function computeStats(catalogProducts, styleGroupsMap, apps, catalogMeta = {}) {
  const catalogSource = catalogMeta.catalogSource || "bulk_json";
  const reliablePrices = catalogMeta.reliablePrices !== false;
  const podApp         = (apps || []).find((a) => POD_APP_NAMES.has(a.name));
  const storePodNames  = (apps || []).filter((a) => POD_APP_NAMES.has(a.name)).map((a) => a.name);
  const storeHasPodApp = storePodNames.length > 0;

  const rawListings    = catalogProducts.length;
  const distinctStyles = styleGroupsMap.size;

  
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const vendors           = new Set();
  /** @type {number[]} */
  const groupReprPrices = [];
  let priceMinSource = null;
  let priceMaxSource = null;
  let charm = 0, round = 0, other = 0;
  let newCount = 0, saleCount = 0, oosCount = 0;
  let digitalCount = 0;
  let podCount     = 0;
  /** @type {number[]} */
  const newProductSaleDiscountSamples = [];

  /** @type {{ title: string; handle: string; url: string; reason: string }[]} */
  const digitalProductDetails = [];
  /** @type {{ title: string; handle: string; url: string; reason: string }[]} */
  const podProductDetails     = [];
  const host = detectionData?.storeDomain || location.hostname;

  let totalVariants    = 0;
  let oldestPublished  = Infinity;
  for (const p of catalogProducts) {
    if (p.vendor) vendors.add(p.vendor);
    totalVariants += (p.variants?.length || 0);
    const pub = p.published_at ? new Date(p.published_at).getTime() : null;
    if (pub && pub < oldestPublished) oldestPublished = pub;
  }

  for (const prods of styleGroupsMap.values()) {
    let styleHasNew           = false;
    let styleOnSale           = false;
    let styleDigitalTriggered = false;
    let stylePodTriggered     = false;

    let saleRepPct = /** @type {number | null} */ (null);
    let saleRepMinPrice       = Infinity;

    for (const p of prods) {
      const created = p.created_at ? new Date(p.created_at).getTime() : null;
      if (created && now - created < 30 * day) styleHasNew = true;

      const variants = p.variants || [];
      for (const v of variants) {
        const price = parseFloat(v.price);
        const cmp   = parseFloat(v.compare_at_price);
        if (cmp && price && cmp > price) styleOnSale = true;
      }

      const rp = representativeProductSaleDiscountPct(p);
      const lp = parseFloat(variants[0]?.price);
      if (rp != null && !Number.isNaN(lp) && lp > 0 && lp < saleRepMinPrice) {
        saleRepMinPrice = lp;
        saleRepPct      = rp;
      }

      const det = classifyProductDetailed(p, storePodNames);
      if (det.isDigital) styleDigitalTriggered = true;
      if (det.isPod) stylePodTriggered = true;
    }

    if (styleHasNew) newCount++;
    if (styleOnSale) {
      saleCount++;
      if (saleRepPct != null) newProductSaleDiscountSamples.push(saleRepPct);
    }
    if (groupIsFullyOos(prods)) oosCount++;
    if (styleDigitalTriggered) {
      digitalCount++;
      const dp = prods.find((x) => classifyProductDetailed(x, storePodNames).isDigital);
      if (dp) {
        const det = classifyProductDetailed(dp, storePodNames);
        digitalProductDetails.push({
          title:  dp.title || "(Untitled)",
          handle: String(dp.handle || ""),
          url:    `https://${host}/products/${dp.handle}`,
          reason: det.digitalReasons.join(" · "),
        });
      }
    }
    if (stylePodTriggered) {
      podCount++;
      const pp = prods.find((x) => classifyProductDetailed(x, storePodNames).isPod);
      if (pp) {
        const det = classifyProductDetailed(pp, storePodNames);
        podProductDetails.push({
          title:  pp.title || "(Untitled)",
          handle: String(pp.handle || ""),
          url:    `https://${host}/products/${pp.handle}`,
          reason: det.podReasons.join(" · "),
        });
      }
    }

    const gpx = cheapestListingPriceInGroup(prods);
    if (!Number.isNaN(gpx) && gpx > 0) {
      groupReprPrices.push(gpx);
      const cents = Math.round((gpx % 1) * 100);
      if (cents === 99 || cents === 95 || cents === 97) charm++;
      else if (cents === 0) round++;
      else other++;
    }
  }

  if (groupReprPrices.length) {
    const priceMinVal = Math.min(...groupReprPrices);
    const priceMaxVal = Math.max(...groupReprPrices);
    for (const prods of styleGroupsMap.values()) {
      const gpx = cheapestListingPriceInGroup(prods);
      if (Number.isNaN(gpx) || gpx <= 0) continue;
      const title = (prods[0]?.title || "(Untitled)").trim();
      if (gpx === priceMinVal && !priceMinSource) priceMinSource = title;
      if (gpx === priceMaxVal && !priceMaxSource) priceMaxSource = title;
      if (priceMinSource && priceMaxSource) break;
    }
    if (!priceMinSource) priceMinSource = "(unknown)";
    if (!priceMaxSource) priceMaxSource = "(unknown)";
  }

            
  const ceiling = distinctStyles || 1;
  const onSaleStylesPreClamp = saleCount;

  newCount     = clampProductBucketCount("newProducts", newCount, ceiling);
  saleCount    = clampProductBucketCount("onSaleProducts", saleCount, ceiling);
  oosCount     = clampProductBucketCount("fullySoldOutProducts", oosCount, ceiling);
  digitalCount = clampProductBucketCount("digitalProducts", digitalCount, ceiling);
  podCount     = clampProductBucketCount("podProducts", podCount, ceiling);

  const newProductLevelAvg =
    newProductSaleDiscountSamples.length > 0
      ? newProductSaleDiscountSamples.reduce((a, b) => a + b, 0)
        / newProductSaleDiscountSamples.length
      : 0;

  
  
  const oldestPublishedAtIso =
    oldestPublished === Infinity ? null : new Date(oldestPublished).toISOString();

  const styleMonthBuckets = buildStyleMonthlyLaunchBuckets(styleGroupsMap);
  const cadence             = buildCadenceBarsFromMonthlyCounts(styleMonthBuckets, "recent").bars;
  const cadenceLifetime     = buildCadenceBarsFromMonthlyCounts(styleMonthBuckets, "lifetime").bars;
  const avgPerMonth         = computeLifetimeAvg(distinctStyles, oldestPublishedAtIso);
  const totalPricingSamples = charm + round + other;

  const priceMin =
    groupReprPrices.length ? Math.min(...groupReprPrices) : 0;
  const priceMax =
    groupReprPrices.length ? Math.max(...groupReprPrices) : 0;
  const priceAvg =
    groupReprPrices.length
      ? groupReprPrices.reduce((a, b) => a + b, 0) / groupReprPrices.length
      : 0;
  const priceMedian = median(groupReprPrices);
  const priceSpread = stdDev(groupReprPrices);

  const stats = {
    products: distinctStyles,
    totalVariants,
    priceMin,
    priceMax,
    priceAvg,
    priceMedian,
    priceStdDev: priceSpread,
    digitalProducts:           digitalCount,
    podProducts:               podCount,
    digitalProductDetails,
    podProductDetails,
    podAppDetected:  storeHasPodApp,
    podAppName:       podApp?.name || null,
    newThisMonth:  newCount,
    onSale:        saleCount,
    avgDiscount:   newProductLevelAvg,
    outOfStock:           oosCount,
    vendorCount:        vendors.size,
    avgVariants: distinctStyles ? totalVariants / distinctStyles : 0,
    oldestPublishedAt: oldestPublishedAtIso,
    cadence,
    cadenceLifetime,
    avgPerMonth,
    pricingPatterns: {
      charm: totalPricingSamples ? (charm / totalPricingSamples) * 100 : 0,
      round: totalPricingSamples ? (round / totalPricingSamples) * 100 : 0,
      other: totalPricingSamples ? (other / totalPricingSamples) * 100 : 0,
    },
    priceBuckets:   computePriceBucketsFromPrices(groupReprPrices),
    variantOptions: computeVariantOptions(catalogProducts),
    catalogSource,
    reliablePrices,
    hidePriceMetrics: false,
    hideVariantMetrics: false,
    hideNewProducts: false,
  };

  const promoDraft = computePromotionIntensity(stats);
  const storeAgeMonths = oldestPublishedAtIso
    ? (Date.now() - new Date(oldestPublishedAtIso).getTime()) / (1000 * 60 * 60 * 24 * 30.44)
    : null;

  const inferredForAudit = inferApps(stats, apps || []);
  const mergedAppsAudit  = mergeDetectedAndHintedApps(apps || [], inferredForAudit);
  const appStackConfirmed = mergedAppsAudit.filter(
    (a) => a.confidence === "confirmed",
  ).length;

  
  const assertFail = () => {};

  if (distinctStyles > rawListings) {
    assertFail(`products (${distinctStyles}) > rawListings (${rawListings})`);
  }
  if (saleCount > distinctStyles) {
    assertFail(`onSaleCount (${saleCount}) > products (${distinctStyles})`);
  }
  if (oosCount > distinctStyles) {
    assertFail(`fullySoldOutCount (${oosCount}) > products (${distinctStyles})`);
  }
  if (newCount > distinctStyles) {
    assertFail(`newProducts30d (${newCount}) > products (${distinctStyles})`);
  }
  if (groupReprPrices.length && priceMin > priceMax) {
    assertFail(`priceMin (${priceMin}) > priceMax (${priceMax})`);
  }
  if (groupReprPrices.length && (priceMedian < priceMin || priceMedian > priceMax)) {
    assertFail(
      `medianPrice (${priceMedian}) outside [${priceMin}, ${priceMax}]`,
    );
  }
  if (groupReprPrices.length && (priceAvg < priceMin || priceAvg > priceMax)) {
    assertFail(`avgPrice (${priceAvg}) outside [${priceMin}, ${priceMax}]`);
  }
  if (rawListings > 0 && vendors.size < 1) {
    assertFail(`distinctVendors (${vendors.size}) < 1 with products loaded`);
  }
  if (oldestPublishedAtIso && new Date(oldestPublishedAtIso).getTime() >= Date.now()) {
    assertFail(`oldestPublishedAt (${oldestPublishedAtIso}) is not before now`);
  }

  return stats;
}

function computeVariantOptions(products) {
  const optionMap = new Map();
  for (const p of products) {
    for (const opt of (p.options || [])) {
      if (!optionMap.has(opt.name)) optionMap.set(opt.name, new Set());
      for (const v of (opt.values || [])) optionMap.get(opt.name).add(v);
    }
  }
  return Array.from(optionMap.entries()).map(([name, values]) => ({
    name,
    valueCount: values.size,
    values:     Array.from(values),
  }));
}

function computeTagAnalysis(products) {
  const counts = new Map();
  for (const p of products) {
    const raw = Array.isArray(p.tags) ? p.tags : String(p.tags || "").split(",");
    for (const tag of raw) {
      const t = tag.trim();
      if (t) counts.set(t, (counts.get(t) || 0) + 1);
    }
  }
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 20);
}

function computeLifetimeAvg(listingCount, oldestPublishedAtIso) {
  if (!listingCount || !oldestPublishedAtIso) return 0;
  const oldest = new Date(oldestPublishedAtIso).getTime();
  const months = Math.max(1, (Date.now() - oldest) / (1000 * 60 * 60 * 24 * 30.44));
  return listingCount / months;
}

// ─── Tooltip copy (ⓘ) - plain English one-liners ─────────────────────────────────

const PROOF_DEFINITIONS = {
  products: {
    plainEnglish:
      "Different products sold in this store. Multiple colors of the same item count as one.",
    verifyPath: "/products.json?limit=250",
  },
  totalVariants: {
    plainEnglish:
      "Every individual SKU. A shoe in 5 colors and 13 sizes counts as 65 variants of 1 product.",
    verifyPath: "/products.json?limit=250",
  },
  listingPriceSpan: {
    plainEnglish: "Cheapest to most expensive starting price across all products.",
    verifyPath: "/products.json?limit=250",
  },
  avgListingPrice: {
    plainEnglish: "Average starting price across all products.",
    verifyPath: "/products.json?limit=250",
  },
  newProducts: {
    plainEnglish:
      "Products first created in this store in the last 30 days (created_at). Restocks and republishes of older products are excluded.",
    verifyPath: "/products.json?limit=250",
  },
  productsOnSale: {
    plainEnglish:
      "Products with at least one variant marked down from its regular price.",
    verifyPath: "/products.json?limit=250",
  },
  fullySoldOut: {
    plainEnglish:
      "Products where every size and color is currently unavailable.",
    verifyPath: "/products.json?limit=250",
  },
  discountLevel: {
    plainEnglish:
      "How many products are on sale right now, as a share of the catalog.",
    verifyPath: "/products.json?limit=250",
  },
  publishingSince: {
    plainEnglish:
      "Date the oldest product in this store was first published publicly. Often matches when the store launched.",
    verifyPath: "/products.json?limit=250",
  },
  avgProductsPerMonth: {
    plainEnglish:
      "How many new products this store has added each month on average since its first published product.",
    verifyPath: "/products.json?limit=250",
  },
  theme: {
    plainEnglish:
      "Which Shopify theme this store uses for its design and layout.",
    verifyPath: null,
  },
  distinctVendors: {
    plainEnglish:
      "How many different brands or makers appear in this store's product data.",
    verifyPath: "/products.json?limit=250",
  },
  avgVariantsPerProduct: {
    plainEnglish:
      "Average number of size and color combinations per product.",
    verifyPath: "/products.json?limit=250",
  },
  medianPrice: {
    plainEnglish:
      "The middle price across all products. Half cost more, half cost less.",
    verifyPath: "/products.json?limit=250",
  },
  priceSpread: {
    plainEnglish:
      "How spread out the prices are. Higher means a wider mix of price points.",
    verifyPath: "/products.json?limit=250",
  },
  appStack: {
    plainEnglish:
      "Third-party apps this store uses, detected from its page code.",
    verifyPath: null,
  },
  pricing_distribution: {
    plainEnglish:
      "Each product grouped by cheapest variant price into five buckets from the catalog.",
    verifyPath: "/products.json?limit=250",
  },
  bestsellers: {
    plainEnglish:
      "Rank order from Shopify's best-selling collection sort on the public storefront. Top 5 shown by default. Click to expand the full list.",
    verifyPath: "/collections/all?sort_by=best-selling",
  },
  changesSinceLastVisit: {
    plainEnglish:
      "What changed in this store since the last time you opened it with MakerPeek.",
    verifyPath: null,
  },
  print_provider: {
    plainEnglish:
      "Detected from the store's app stack. Major providers take precedence over mid-tier and niche.",
    verifyPath: null,
  },
};

function proofIcon(metricKey) {
  const def = PROOF_DEFINITIONS[metricKey];
  if (!def) return "";
  const domain = detectionData?.storeDomain || location.hostname;
  const source = catalogSourceCache?.source || dataCache?.catalogSource || "bulk_json";
  const tipText =
    typeof mpProofMethodology === "function"
      ? mpProofMethodology(metricKey, source)
      : def.plainEnglish;
  const verifyPath =
    typeof mpProofVerifyPath === "function"
      ? mpProofVerifyPath(metricKey, source)
      : def.verifyPath;
  const verify = verifyPath ? `https://${domain}${verifyPath}` : "";
  return `<span class="mp-proof-wrap"><button type="button" class="mp-proof-btn" aria-label="What this means" data-tip-text="${escHtml(tipText)}" data-tip-verify="${escHtml(verify)}">ⓘ</button></span>`;
}


// ─── Watchlist snapshot helper (mirrors watchlist.js buildSlimSnapshot) ───────

function buildSlimSnapshotInline(products, fetchedAt) {
  const slim = {};
  for (const p of products) {
    const fv = p.variants?.[0];
    if (!fv) continue;
    slim[String(p.id)] = {
      title:            p.title,
      handle:           p.handle,
      available:        p.variants.some((v) => v.available !== false),
      price:            parseFloat(fv.price) || 0,
      compare_at_price: fv.compare_at_price ? parseFloat(fv.compare_at_price) : null,
      variant_count:    p.variants.length,
    };
  }
  return { products: slim, fetchedAt: fetchedAt || new Date().toISOString() };
}

// ─── Render helpers ───────────────────────────────────────────────────────────

function statsCard(rows) {
  return `
    <div class="mp-stats-card mp-section-gap">
      ${rows.map(([label, val]) => `
        <div class="mp-stat-row">
          <span class="mp-stat-label">${label}</span>
          <span class="mp-stat-value">${val}</span>
        </div>`).join("")}
    </div>`;
}

// ─── Skeleton / pro-gate helpers ─────────────────────────────────────────────

const SKELETONS = {
  priceDistribution: `
    <div class="skeleton-rows">
      ${Array(6).fill(0).map(() => `
        <div class="skeleton-row">
          <div class="skeleton-label"></div>
          <div class="skeleton-bar" style="width:${30 + Math.floor(Math.random() * 60)}%"></div>
          <div class="skeleton-value"></div>
        </div>`).join("")}
    </div>`,

  variantOptions: `
    <div class="skeleton-rows">
      <div class="skeleton-row"><div class="skeleton-label" style="width:60px"></div><div class="skeleton-chips"><span></span><span></span><span></span><span></span></div></div>
      <div class="skeleton-row"><div class="skeleton-label" style="width:80px"></div><div class="skeleton-chips"><span></span><span></span><span></span></div></div>
      <div class="skeleton-row"><div class="skeleton-label" style="width:50px"></div><div class="skeleton-chips"><span></span><span></span></div></div>
    </div>`,

  pricingPatterns: `
    <div class="skeleton-rows">
      ${Array(5).fill(0).map(() => `
        <div class="skeleton-row">
          <div class="skeleton-label" style="width:${80 + Math.floor(Math.random() * 60)}px"></div>
          <div class="skeleton-value"></div>
        </div>`).join("")}
    </div>`,

  totalVariants: `<div class="skeleton-inline-value"></div>`,

  fullProductList: `
    <div class="skeleton-rows">
      ${Array(5).fill(0).map(() => `
        <div class="skeleton-row product">
          <div class="skeleton-thumb"></div>
          <div class="skeleton-text-block">
            <div class="skeleton-line" style="width:70%"></div>
            <div class="skeleton-line short" style="width:40%"></div>
          </div>
        </div>`).join("")}
    </div>`,
};

function renderSkeleton(shape) {
  return `
    <div class="skeleton-wrap">
      ${shape}
      <div class="pro-overlay">
        <button class="pro-cta" data-action="upgrade">Get Pro ($11/mo)</button>
      </div>
    </div>`;
}

function renderProGated(paid, realContentFn, skeleton) {
  return paid ? realContentFn() : renderSkeleton(skeleton);
}

// Wraps renderProGated in a section div with a title
// ─── Calendar heatmap (lifetime view - grouped product launches per month) ─────────────

function renderLifetimeCalendarFromMonthlyBars(bars) {
  if (!bars || !bars.length) return `<p class="mp-sub">No cadence data.</p>`;

  const buckets = new Map();
  for (const b of bars) {
    if (!b?.month) continue;
    buckets.set(b.month, b.count ?? 0);
  }
  if (!buckets.size) return `<p class="mp-sub">No date data.</p>`;

  const years        = [...new Set([...buckets.keys()].map((k) => k.slice(0, 4)))].sort();
  const now          = new Date();
  const currentYear  = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  let maxCount = 0;
  for (const c of buckets.values()) if (c > maxCount) maxCount = c;
  const safeMax = maxCount || 1;

  function intensityClass(count) {
    if (count === 0) return "cal-empty";
    const ratio = count / safeMax;
    if (ratio < 0.25) return "cal-l1";
    if (ratio < 0.5)  return "cal-l2";
    if (ratio < 0.75) return "cal-l3";
    return "cal-l4";
  }

  const monthLabels = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  let html = `
    <div class="calendar">
      <div class="calendar-header">
        <div class="calendar-year-label"></div>
        ${monthLabels.map((m) => `<div class="calendar-month-label">${m}</div>`).join("")}
      </div>`;

  for (const year of years) {
    html += `<div class="calendar-row"><div class="calendar-year-label">${year}</div>`;
    for (let m = 1; m <= 12; m++) {
      const key      = `${year}-${String(m).padStart(2, "0")}`;
      const count    = buckets.get(key) || 0;
      const isFuture = parseInt(year) > currentYear ||
                       (parseInt(year) === currentYear && m > currentMonth);
      if (isFuture) {
        html += `<div class="calendar-cell cal-future"></div>`;
      } else {
        html += `<div class="calendar-cell ${intensityClass(count)}" title="${key}: ${count} new products">${count > 0 ? count : ""}</div>`;
      }
    }
    html += `</div>`;
  }
  html += `</div>`;
  return html;
}

// ─── Cadence sparkline block ──────────────────────────────────────────────────

function renderSparkline(barsData, lifetimeMode = false) {
  if (!barsData.length) return "";
  const maxCount = Math.max(...barsData.map((m) => m.count), 1);
  const MAX_H    = 48;

  const barEls = barsData.map((m) => {
    const fillH  = m.count > 0 ? Math.max(2, Math.round((m.count / maxCount) * MAX_H)) : 2;
    const dt     = new Date(m.month + "-02");
    const isJan  = m.month.endsWith("-01");
    const label  = lifetimeMode
      ? (isJan ? dt.toLocaleDateString("en", { month: "short", year: "2-digit" }) : dt.toLocaleDateString("en", { month: "short" }))
      : dt.toLocaleDateString("en", { month: "short" });
    const countEl = m.count > 0
      ? `<span class="cadence-bar-count">${m.count}</span>`
      : `<span class="cadence-bar-count" style="visibility:hidden">0</span>`;
    return `<div class="cadence-bar">
      ${countEl}
      <div class="cadence-bar-fill" style="height:${fillH}px"></div>
      <span class="cadence-bar-label">${label}</span>
    </div>`;
  }).join("");

  return `<div class="cadence-scroll"><div class="cadence${lifetimeMode ? " lifetime" : ""}">${barEls}</div></div>`;
}

function renderCadenceBlock(d, isPaid, mode) {
  const isLifetime = mode === "lifetime";

  let innerHTML;
  if (isLifetime) {
    innerHTML = renderLifetimeCalendarFromMonthlyBars(d.cadenceLifetime || []);
  } else {
    innerHTML = renderSparkline(d.cadence || [], false);
  }

  let toggleHTML;
  if (isLifetime) {
    toggleHTML = `<button class="mp-cadence-toggle" id="mp-cadence-toggle">← Recent 6 months</button>`;
  } else if (isPaid) {
    toggleHTML = `<button class="mp-cadence-toggle" id="mp-cadence-toggle">View full history</button>`;
  } else {
    toggleHTML = `<button class="mp-cadence-toggle mp-cadence-toggle--gated" id="mp-cadence-toggle">View full history <span class="mp-pro-badge">PRO</span></button>`;
  }

  return `
    <div class="mp-spark-wrap">${innerHTML}</div>
    <div class="mp-cadence-actions">${toggleHTML}</div>`;
}

function handleCadenceToggle() {
  if (!panelEl || !dataCache) return;
  const isPaid = proCache?.paid ?? false;
  if (cadenceMode === "recent" && !isPaid) {
    sendUpgrade("cadence_lifetime");
    return;
  }
  cadenceMode = cadenceMode === "recent" ? "lifetime" : "recent";
  const wrap  = panelEl.querySelector("#mp-cadence-block");
  if (wrap) {
    wrap.innerHTML = renderCadenceBlock(dataCache, isPaid, cadenceMode);
    const newBtn   = wrap.querySelector("#mp-cadence-toggle");
    if (newBtn) newBtn.addEventListener("click", handleCadenceToggle);
  }
}

function buildThemeProfilePresentation(themeRaw) {
  const fallback = typeof themeRaw === "string" ? themeRaw.trim() : "";
  const t =
    themeRaw && typeof themeRaw === "object"
      ? themeRaw
      : null;
  const sources =
    typeof t?.sources === "string" && t.sources.trim().length
      ? t.sources.trim()
      : "Theme name detected from storefront JavaScript (Shopify.theme, ShopifyAnalytics, or inline JSON).";

  let nameLine =
    (t?.displayName && String(t.displayName).trim()) ||
    fallback ||
    "";
  if (!nameLine) nameLine = "Custom or unknown theme.";
  const roleRaw =
    typeof t?.role === "string" && t.role.trim()
      ? t.role.trim()
      : null;
  const usedRoleFallback =
    t?.chosenSource === "Shopify.theme.role + \" theme\"" || false;
  const suffixRole =
    roleRaw && roleRaw.toLowerCase() !== "null" && !usedRoleFallback
      ? roleRaw
      : null;
  const summaryFull = suffixRole ? `${nameLine} (${suffixRole})` : nameLine;
  return {
    methodology: sources,
    summaryFull,
    /** Prefer summaryFull; kept for callers using legacy `.summary` */
    get summary() { return summaryFull; },
    get sources() { return sources; },
  };
}

/** Theme row - 2-line clamp with expand when long; hover shows full title on the value. */
function renderThemeProfileValueHtml(tp) {
  const full = tp.summaryFull || "n/a";
  const SHORT_ENOUGH_CHARS = 48;
  const needsExpandBtn    = full.length > SHORT_ENOUGH_CHARS || full.includes("\n");
  themeProfileUICache     = {
    expandable: Boolean(needsExpandBtn),
    fullName:   full,
  };
  const proof   = proofIcon("theme");
  const titleAt = escHtml(full);
  const bodyEl  = `<span class="mp-theme-body-text${needsExpandBtn ? "" : " mp-theme-body-text--compact"}">${escHtml(full)}</span>`;
  if (needsExpandBtn) {
    return `<span class="mp-theme-profile-slot"><button type="button" class="mp-theme-expand-btn" id="mp-theme-expand-btn" aria-expanded="false" title="${titleAt}">${bodyEl}</button>${proof}</span>`;
  }
  return `<span class="mp-theme-profile-slot"><span class="mp-theme-expand-btn mp-theme-expand-btn--static"><span class="mp-theme-body-text mp-theme-body-text--compact" title="${titleAt}">${escHtml(full)}</span></span>${proof}</span>`;
}

// ─── Promotion intensity ──────────────────────────────────────────────────────

function promotionLabelSlug(label) {
  return String(label)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9_]/g, "");
}

function computePromotionIntensity(stats) {
  const total = stats?.products ?? 0;
  if (!total) {
    return {
      pctOnSale: 0,
      label:     "No data",
      labelSlug: "no_data",
    };
  }
  if (stats.onSale === 0) {
    return {
      pctOnSale: 0,
      label:     "No discounts",
      labelSlug: "no_discounts",
    };
  }

  const pctRaw = (stats.onSale / total) * 100;
  const pctOnSale = Math.round(pctRaw);

  let label;
  if (pctRaw <= 15) label = "A few products on sale";
  else if (pctRaw <= 45) label = "Some products on sale";
  else if (pctRaw <= 75) label = "Many products on sale";
  else if (pctRaw <= 90) label = "Most products on sale";
  else label = "Almost every product on sale";

  return {
    pctOnSale,
    label,
    labelSlug: promotionLabelSlug(label),
  };
}

// ─── Diff renderer ────────────────────────────────────────────────────────────

function renderDiffSection(diff) {
  if (diff === undefined) return ""; // not yet computed
  if (diff === null) {
    return `<div class="mp-diff-first-visit"><span class="mp-diff-fv-icon">📍</span><span class="mp-diff-fv-text">First visit. Open this store again later to see what changed.</span></div>`;
  }

  const prevDate = new Date(diff.previousCapturedAt).toLocaleDateString("en", { month: "short", day: "numeric" });
  const currDate = new Date(diff.currentCapturedAt).toLocaleDateString("en",  { month: "short", day: "numeric" });
  const days     = Math.round(diff.daysBetween);
  const daysStr  = days <= 0 ? "Earlier today" : days === 1 ? "1 day ago" : `${days} days ago`;

  const cats = [
    { key: "added",       items: diff.added,       label: (n) => `${n} new product${n !== 1 ? "s" : ""}`,       renderItem: (i) => escHtml(i.title) },
    { key: "removed",     items: diff.removed,     label: (n) => `${n} product${n !== 1 ? "s" : ""} removed`,   renderItem: (i) => escHtml(i.title) },
    { key: "wentOOS",     items: diff.wentOOS,     label: (n) => `${n} went out of stock`,                      renderItem: (i) => escHtml(i.title) },
    { key: "restocked",   items: diff.restocked,   label: (n) => `${n} restocked`,                              renderItem: (i) => escHtml(i.title) },
    { key: "priceUp",     items: diff.priceUp,     label: (n) => `${n} price${n !== 1 ? "s" : ""} increased`,  renderItem: (i) => `${escHtml(i.title)} <span class="mp-diff-price mp-diff-price--up">$${i.from.toFixed(2)} → $${i.to.toFixed(2)}</span>` },
    { key: "priceDown",   items: diff.priceDown,   label: (n) => `${n} price${n !== 1 ? "s" : ""} decreased`,  renderItem: (i) => `${escHtml(i.title)} <span class="mp-diff-price mp-diff-price--down">$${i.from.toFixed(2)} → $${i.to.toFixed(2)}</span>` },
    { key: "newlyOnSale", items: diff.newlyOnSale, label: (n) => `${n} newly on sale`,                          renderItem: (i) => escHtml(i.title) },
    { key: "saleEnded",   items: diff.saleEnded,   label: (n) => `${n} sale${n !== 1 ? "s" : ""} ended`,        renderItem: (i) => escHtml(i.title) },
  ].filter((c) => c.items.length > 0);

  if (cats.length === 0) {
    return `<p class="mp-sub mp-diff-nochange">No changes detected since ${prevDate}.</p>`;
  }

  const rows = cats.map(({ key, items, label, renderItem }) => `
    <div class="mp-diff-row">
      <button class="mp-diff-toggle" data-diff-key="${key}">
        <span class="mp-diff-label">${label(items.length)}</span>
        <span class="mp-diff-caret">▾</span>
      </button>
      <div class="mp-diff-items" id="mp-diff-${key}" hidden>
        ${items.slice(0, 25).map((i) => `<div class="mp-diff-item">${renderItem(i)}</div>`).join("")}
        ${items.length > 25 ? `<div class="mp-diff-item mp-diff-more">+${items.length - 25} more</div>` : ""}
      </div>
    </div>`).join("");

  return `<div class="mp-diff-subtitle">${escHtml(daysStr)} · ${escHtml(prevDate)} → ${escHtml(currDate)}</div>${rows}`;
}

// ─── Tooltip positioning ──────────────────────────────────────────────────────

function positionTooltip(triggerEl, tooltipEl) {
  // Make visible at 0,0 so getBoundingClientRect gives real dimensions
  tooltipEl.style.visibility = "hidden";
  tooltipEl.style.left = "0px";
  tooltipEl.style.top  = "0px";

  const tr     = triggerEl.getBoundingClientRect();
  const tip    = tooltipEl.getBoundingClientRect();
  const margin = 8;
  const vw     = window.innerWidth;
  const vh     = window.innerHeight;

  // Vertical: below trigger unless not enough room, then above
  const spaceBelow = vh - tr.bottom;
  const top = spaceBelow >= tip.height + margin
    ? tr.bottom + 6
    : Math.max(margin, tr.top - tip.height - 6);

  // Horizontal: centered on trigger, clamped to viewport
  let left = tr.left + tr.width / 2 - tip.width / 2;
  if (left + tip.width > vw - margin) left = vw - tip.width - margin;
  if (left < margin) left = margin;

  tooltipEl.style.left = `${left}px`;
  tooltipEl.style.top  = `${top}px`;
  tooltipEl.style.visibility = "visible";
}

// ─── Inferred app heuristics ─────────────────────────────────────────────────

function inferApps(stats, detectedApps) {
  /** @type {{ name:string; category:string; detail:string; confidence:'likely'|'possible' }[]} */
  const inferred           = [];
  const detectedNamesLower = new Set(
    (detectedApps || []).map((a) => String(a.name).toLowerCase()),
  );

  const hasPodKeywords = /aop|all[- ]?over[- ]?print|sublimat|print[- ]?on[- ]?demand/i.test(
    document.body?.innerText || "",
  );
  const highVariantSignal = (stats?.avgVariants || 0) >= 15;
  const hasPodApp         = (detectedApps || []).some((a) =>
    /Printify|Printful|Gooten|CustomCat|SPOD|T[- ]Pop|JetPrint|Apliiq|AOP\+|Pillow Profits|Print Aura/i.test(a.name));

  if (!hasPodApp && (hasPodKeywords || highVariantSignal)) {
    const strongCombo = hasPodKeywords && highVariantSignal;
    inferred.push({
      name:       "POD fulfillment (Printify, Printful, or similar)",
      category:   "Fulfillment / POD",
      confidence: strongCombo ? "likely" : "possible",
      detail:
        strongCombo
          ? "Print vocabulary plus unusually deep variant grids. Strong hint of made-to-order production."
          : highVariantSignal
            ? `${(stats?.avgVariants || 0).toFixed(
              1,
            )} variants per product with both size and color options on average. Typical for POD apparel.`
            : "Print-focused wording surfaced in visible page copy.",
    });
  }

  if (!detectedNamesLower.has("shop pay")) {
    const shopPay = typeof detectShopPayStrict === "function" ? detectShopPayStrict() : { matched: false };
    if (shopPay.matched) {
      inferred.push({
        name:       "Shop Pay",
        category:   "Payments",
        confidence: "confirmed",
        detail:     shopPay.evidence || "Shop Pay checkout surface detected",
      });
    }
  }

  const hasEmailForm = !!document.querySelector(
    'form input[type="email"], form input[name*="email" i]',
  );
  const hasEmailApp =
    [...detectedNamesLower].some((n) =>
      /^(klaviyo|mailchimp|omnisend|drip|activecampaign|sendlane)$/i.test(n),
    )
    || (detectedApps || []).some((a) =>
      /Klaviyo|Mailchimp|Omnisend|Drip|ActiveCampaign|Sendlane/i.test(a.name),
    );
  if (hasEmailForm && !hasEmailApp) {
    inferred.push({
      name:       "Email signup (Shopify Email, Klaviyo, Omnisend…)",
      category:   "Email",
      confidence: "possible",
      detail:     "Captured email inputs without yet matching an ESP storefront script.",
    });
  }

  const hasCurrencySelector = !!document.querySelector(
    '[class*="currency" i] select, [data-currency], form[action*="currencies"]',
  );
  if (hasCurrencySelector) {
    inferred.push({
      name:       "Multi-currency or Markets tooling",
      category:   "Localization",
      confidence: "possible",
      detail:     "Detected currency selector motif in storefront markup.",
    });
  }

  return inferred;
}

// ─── App stack (merge detectors + hints) ───────────────────────────────────────

const APP_CONF_RANK = { confirmed: 3, likely: 2, possible: 1 };

function normalizeDetectorConfidence(a) {
  const c = String(a.confidence || "confirmed").toLowerCase();
  if (c === "confirmed" || c === "likely" || c === "possible") return c;
  return "confirmed";
}

function mergeDetectedAndHintedApps(detectedRaw, inferredRows) {
  const merged = new Map();
  /** @param {{ name:string; category:string; confidence:string; detail?:string }} entry */
  const add = (entry) => {
    const key = String(entry.name || "").trim().toLowerCase();
    if (!key) return;
    const rk  = APP_CONF_RANK[entry.confidence] ?? 1;
    const prev = merged.get(key);
    if (
      !prev ||
      rk > APP_CONF_RANK[prev.confidence] ||
      (
        rk === APP_CONF_RANK[prev.confidence] &&
        String(entry.detail || "").length > String(prev.detail || "").length
      )
    ) {
      merged.set(key, {
        name:       entry.name,
        category:   entry.category || "Uncategorized",
        confidence: entry.confidence,
        detail:     entry.detail || "",
      });
    }
  };

  for (const a of detectedRaw || []) {
    const detail =
      (a.detail && String(a.detail)) ||
      (a.matchedPattern ? `Pattern match: ${a.matchedPattern}` : "");
    add({
      name:       a.name,
      category:   a.category,
      confidence: normalizeDetectorConfidence(a),
      detail,
    });
  }
  for (const row of inferredRows || []) add(row);

  return [...merged.values()].sort((l, r) =>
    APP_CONF_RANK[r.confidence] - APP_CONF_RANK[l.confidence]
      || String(l.name || "").localeCompare(String(r.name || "")),
  );
}

function confidenceBadgeHtml(conf) {
  const label =
    conf === "confirmed" ? "Confirmed"
      : conf === "likely" ? "Likely"
        : "Possible";
  const slug = label.toLowerCase();
  return `<span class="mp-app-conf mp-app-conf--${slug}">${escHtml(label)}</span>`;
}

function renderAppStackRowHtml(a) {
  return `
          <div class="mp-app-stack-row">
            <div class="mp-app-stack-head">
              <span class="mp-app-stack-name">${escHtml(a.name)}</span>
              ${confidenceBadgeHtml(a.confidence)}
            </div>
            <div class="mp-app-stack-meta">
              <span class="mp-app-cat">${escHtml(a.category)}</span>
              ${
                a.detail
                  ? `<span class="mp-app-stack-hint">${escHtml(a.detail)}</span>`
                  : ""
              }
            </div>
          </div>`;
}

function renderPanel(state, errorMsg, loadingMsg) {
  if (!panelEl) return;
  const domain  = detectionData?.storeDomain || location.hostname;
  const apps    = detectionData?.apps || [];
  const isPaid  = proCache?.paid ?? false;
  const used    = usageCache?.count ?? 0;

  let bodyHTML    = "";
  // ── Non-loaded states ─────────────────────────────────────────────────────
  if (state === "idle") {
    bodyHTML = `<div class="mp-empty-state"><p>Open the panel to load store data.</p></div>`;

  } else if (state === "loading") {
    bodyHTML = `
      <div class="mp-center-state">
        <div class="mp-spinner"></div>
        <p>${escHtml(loadingMsg || "Fetching product data…")}</p>
      </div>`;

  } else if (state === "error") {
    bodyHTML = `
      <div class="mp-center-state mp-error-state">
        <p>⚠ Could not load product data.</p>
        <p class="mp-sub">${escHtml(errorMsg || "Unknown error")}</p>
      </div>`;

  } else if (state === "not-shopify") {
    const ep     = detectionData?.productsEndpoint || {};
    const status = ep.status;
    if (status === 401 || status === 403) {
      bodyHTML = `
        <div class="mp-ns-state">
          <div class="mp-ns-icon">🔒</div>
          <h3 class="mp-ns-title">This store has /products.json disabled</h3>
          <p class="mp-ns-detail">Status: HTTP ${status}</p>
          <p class="mp-ns-text">The store owner has restricted public product data, or the store is password-protected.</p>
        </div>`;
    } else if (status === 404) {
      bodyHTML = `
        <div class="mp-ns-state">
          <h3 class="mp-ns-title">Not a Shopify store</h3>
          <p class="mp-ns-text">We didn't detect any Shopify signals on this page.</p>
        </div>`;
    } else if (ep.error) {
      bodyHTML = `
        <div class="mp-ns-state">
          <div class="mp-ns-icon">⚠</div>
          <h3 class="mp-ns-title">Could not connect to /products.json</h3>
          <p class="mp-ns-detail">Error: ${escHtml(ep.error)}</p>
          <div class="mp-ns-actions">
            <button class="mp-ns-retry-btn" id="mp-retry">Try again</button>
          </div>
        </div>`;
    } else {
      bodyHTML = `
        <div class="mp-ns-state">
          <h3 class="mp-ns-title">Not a Shopify store</h3>
          <p class="mp-ns-text">We didn't detect any Shopify signals on this page.</p>
        </div>`;
    }

  } else if (state === "loaded" && dataCache) {
    const d = dataCache;
    const isBlocked = d.blocked || d.catalogSource === "blocked";

    const blockedBanner = isBlocked ? renderBlockedBanner() : "";

    // ── Capped banner ─────────────────────────────────────────────────────
    const cappedBanner =
      !isBlocked && d.capped
        ? `<div class="mp-capped-banner">2,500+ products. Stats use the first 2,500 only.</div>`
        : "";


    const productsFetchBanner =
      !isBlocked && d.productsFetchError
      ? `<div class="mp-products-fetch-banner">
           Fetch stopped partway. Error on catalog page ${d.productsFetchError.page}: ${escHtml(d.productsFetchError.message)}.
           <button type="button" class="mp-show-more mp-products-fetch-retry-btn">Tap to retry.</button>
         </div>`
      : "";

    // ── 1. Overview ───────────────────────────────────────────────────────
    const hidePrices = d.hidePriceMetrics;
    const hideVariants = d.hideVariantMetrics;
    const hideNew = d.hideNewProducts;

    const priceRangeVal =
      !hidePrices && d.priceMin > 0
      ? `$${d.priceMin.toFixed(2)} to $${d.priceMax.toFixed(2)} ${proofIcon("listingPriceSpan")}`
      : "n/a";
    const priceAvgVal =
      !hidePrices && d.priceAvg > 0
      ? `$${d.priceAvg.toFixed(2)} ${proofIcon("avgListingPrice")}`
      : "n/a";
    const priceMedianVal =
      !hidePrices && d.priceMedian > 0
      ? `$${d.priceMedian.toFixed(2)} ${proofIcon("medianPrice")}`
      : "n/a";
    const priceSpreadVal =
      !hidePrices && d.priceStdDev > 0
      ? `$${d.priceStdDev.toFixed(2)} ${proofIcon("priceSpread")}`
      : "n/a";

    const productsHeadline =
      `${d.products.toLocaleString()} ${proofIcon("products")}${d.capped ? ` <span class="mp-note">(2,500+)</span>` : ""}`;
    // Total variants row - indented, gated
    const tvPaidRow = `
      <div class="mp-stat-row mp-stat-row--indent">
        <span class="mp-stat-label">└ Total variants</span>
        <span class="mp-stat-value mp-stat-value--small">${d.totalVariants.toLocaleString()} ${proofIcon("totalVariants")}</span>
      </div>`;
    const tvFreeRow = `
      <div class="mp-stat-row mp-stat-row--indent mp-tv-gated" style="cursor:pointer">
        <span class="mp-stat-label">└ Total variants <span class="mp-pro-badge">PRO</span></span>
        <span class="mp-stat-value mp-stat-value--small">${SKELETONS.totalVariants}</span>
      </div>`;
    const tvRow = !hideVariants && isPaid ? tvPaidRow : !hideVariants ? tvFreeRow : "";

    const overviewCard = `
      <div class="mp-stats-card mp-section-gap">
        <div class="mp-stat-row">
          <span class="mp-stat-label">Products</span>
          <span class="mp-stat-value">${productsHeadline}</span>
        </div>
        ${tvRow}
        <div class="mp-stat-row">
          <span class="mp-stat-label">Price span</span>
          <span class="mp-stat-value">${priceRangeVal}</span>
        </div>
        <div class="mp-stat-row">
          <span class="mp-stat-label">Avg. price</span>
          <span class="mp-stat-value">${priceAvgVal}</span>
        </div>
        <div class="mp-stat-row">
          <span class="mp-stat-label">Median price</span>
          <span class="mp-stat-value">${priceMedianVal}</span>
        </div>
        <div class="mp-stat-row mp-stat-row--last">
          <span class="mp-stat-label">Price spread</span>
          <span class="mp-stat-value">${priceSpreadVal}</span>
        </div>
      </div>`;

    // ── 2. Activity ───────────────────────────────────────────────────────
    const piRaw = d.promotionIntensity
      || { label: "No data", labelSlug: "no_data", pctOnSale: 0 };
    const piSlug = piRaw.labelSlug || promotionLabelSlug(piRaw.label || "");
    const piDiscountBody =
      piRaw.label === "No data"
        ? `<span class="mp-note">Nothing loaded yet.</span> ${proofIcon("discountLevel")}`
        : `<span><span class="mp-promo-label mp-promo-label--${piSlug}">${escHtml(piRaw.label)}</span> ${proofIcon("discountLevel")}</span>`
          + `<span class="mp-activity-sub">${piRaw.pctOnSale}% of products on sale</span>`;

    const newProductsRow = hideNew
      ? ""
      : `<div class="mp-stat-row">
          <span class="mp-stat-label">New products (30 days)</span>
          <span class="mp-stat-value">${d.newThisMonth.toLocaleString()} ${proofIcon("newProducts")}</span>
        </div>`;

    const activityCard = `
      <div class="mp-stats-card mp-section-gap">
        ${newProductsRow}
        <div class="mp-stat-row mp-stat-row--stack">
          <span class="mp-stat-label">Products on sale</span>
          <span class="mp-stat-value mp-stat-stack-val">
            <span>${d.onSale.toLocaleString()} ${proofIcon("productsOnSale")}</span>${
              d.onSale > 0 && d.avgDiscount > 0
                ? `<span class="mp-activity-sub">avg ${Math.round(d.avgDiscount)}% off</span>`
                : ""
            }
          </span>
        </div>
        <div class="mp-stat-row">
          <span class="mp-stat-label">Fully sold-out products</span>
          <span class="mp-stat-value">${d.outOfStock.toLocaleString()} ${proofIcon("fullySoldOut")}</span>
        </div>
        <div class="mp-stat-row mp-stat-row--stack mp-stat-row--last">
          <span class="mp-stat-label">Discount level</span>
          <span class="mp-stat-value mp-stat-stack-val">${piDiscountBody}</span>
        </div>
      </div>`;

    // ── 3. Store maturity ─────────────────────────────────────────────────
    const storeAgeStr = formatStoreAge(d.oldestPublishedAt);
    const pubSinceDisplay =
      d.oldestPublishedAt && storeAgeStr
        ? `${new Date(d.oldestPublishedAt).toLocaleDateString(undefined, {
          year:  "numeric",
          month: "short",
          day:   "numeric",
        })} · ${storeAgeStr}`
        : null;
    const maturityRows = [
      [
        "Publishing since",
        pubSinceDisplay
          ? `${escHtml(pubSinceDisplay)} ${proofIcon("publishingSince")}`
          : "n/a",
      ],
      ["Avg products / month since first published", `${d.avgPerMonth.toFixed(1)} ${proofIcon("avgProductsPerMonth")}`],
    ];
    const maturitySection = `
      <div class="mp-section-title">Store maturity</div>
      ${statsCard(maturityRows)}
      <div id="mp-cadence-block">${renderCadenceBlock(d, isPaid, cadenceMode)}</div>`;

    // ── 4. Store profile ──────────────────────────────────────────────────
    const tpTheme           = buildThemeProfilePresentation(detectionData?.theme);
    const themeValueHtml    = renderThemeProfileValueHtml(tpTheme);
    const vendorsRowProof   = `${d.vendorCount} ${proofIcon("distinctVendors")}`;
    const avgVarRowProof    = `${d.avgVariants.toFixed(1)} ${proofIcon("avgVariantsPerProduct")}`;
    const profileCardMarkup = isBlocked
      ? `
      <div class="mp-stats-card mp-section-gap mp-store-profile-card">
        <div class="mp-stat-row mp-stat-row--stack mp-stat-row--profile-str mp-stat-row--last">
          <span class="mp-stat-label">Theme:</span>
          <span class="mp-stat-value mp-stat-value--profile">${themeValueHtml}</span>
        </div>
      </div>`
      : `
      <div class="mp-stats-card mp-section-gap mp-store-profile-card">
        <div class="mp-stat-row mp-stat-row--stack mp-stat-row--profile-str">
          <span class="mp-stat-label">Theme:</span>
          <span class="mp-stat-value mp-stat-value--profile">${themeValueHtml}</span>
        </div>
        <div class="mp-stat-row">
          <span class="mp-stat-label">Distinct vendors</span>
          <span class="mp-stat-value">${vendorsRowProof}</span>
        </div>
        <div class="mp-stat-row mp-stat-row--last">
          <span class="mp-stat-label">Avg variants per product</span>
          <span class="mp-stat-value">${avgVarRowProof}</span>
        </div>
      </div>`;


    let appStackHTML = "";
    try {
      appStackHTML = renderAppStackSection(apps, isPro());
    } catch (_err) {
      appStackHTML = `
      <div class="mp-section">
        <div class="mp-section-title">App stack</div>
        <p class="mp-sub">Couldn't load app stack.
          <button type="button" class="mp-show-more mp-section-retry-btn">Click to retry.</button></p>
      </div>`;
    }

    let diffSection = "";
    try {
      const diffSectionContent = renderDiffSection(d.diff);
      diffSection = `
      <div class="mp-section mp-section--diff">
        <div class="mp-section-title mp-section-title--top">Changes since last visit ${proofIcon("changesSinceLastVisit")}</div>
        ${diffSectionContent}
      </div>`;
    } catch (_err) {
      diffSection = `
      <div class="mp-section mp-section--diff">
        <div class="mp-section-title mp-section-title--top">Changes since last visit</div>
        <p class="mp-sub">Couldn't load saved snapshots for this store.
          <button type="button" class="mp-show-more mp-section-retry-btn">Click to retry.</button></p>
      </div>`;
    }

    const overviewBlock = isBlocked
      ? ""
      : `<div class="mp-section-title">Overview</div>
      ${overviewCard}`;

    const activityBlock = isBlocked
      ? ""
      : `<div class="mp-section-title">Activity</div>
      ${activityCard}`;

    const maturityBlock = isBlocked ? "" : maturitySection;

    function bestsellersRenderMode() {
      if (isBlocked) return "hidden";
      if (bestsellersCache === "hidden") return "hidden";
      if (bestsellersCache === "loading") return "loading";
      if (Array.isArray(bestsellersCache)) {
        return bestsellersCache.length ? "data" : "hidden";
      }
      return "hidden";
    }

    const pricingBlock = isBlocked
      ? ""
      : renderPricingDistributionSection(d.priceDistribution);
    const bsMode = bestsellersRenderMode();
    const bestsellersBlock = isBlocked
      ? ""
      : renderBestsellersSectionHTML(
          Array.isArray(bestsellersCache) ? bestsellersCache : [],
          isPro(),
          location.origin,
          bsMode,
        );
    const profileSection = `<div class="mp-section-title">Store profile</div>
      ${profileCardMarkup}`;

    if (isBlocked) {
      bodyHTML =
        blockedBanner +
        profileSection +
        appStackHTML;
    } else {
      bodyHTML =
        blockedBanner +
        cappedBanner +
        productsFetchBanner +
        diffSection +
        overviewBlock +
        pricingBlock +
        activityBlock +
        bestsellersBlock +
        maturityBlock +
        profileSection +
        appStackHTML;
    }
  }

  // ── Watchlist button (only persistence for stores) ─────────────────────────
  const isWatchingNow = watchlistCache?.watching ?? false;
  let watchStoreBtn = "";
  if (state === "loaded") {
    if (!isPaid) {
      watchStoreBtn = `<button class="mp-save-btn mp-gate-btn" id="mp-watch-store" title="Add to watchlist (Pro)">★ Add to Watchlist <span class="mp-pro-badge">PRO</span></button>`;
    } else if (isWatchingNow) {
      watchStoreBtn = `<button class="mp-save-btn mp-watch-btn--active" id="mp-watch-store" title="On watchlist - click to remove">★ On Watchlist</button>`;
    } else {
      watchStoreBtn = `<button class="mp-save-btn" id="mp-watch-store" title="Add this store to your watchlist">★ Add to Watchlist</button>`;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  let footerHTML = "";
  if (state === "loaded" && auditCache) {
    const ac        = auditCache;
    const fetTime   = new Date(ac.fetchedAt).toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit" });
    const NProducts = typeof ac.productGroups === "number" ? ac.productGroups : 0;
    const VVar = typeof ac.totalVariants === "number" ? ac.totalVariants : 0;
    const countsLine =
      `Products: ${NProducts.toLocaleString()} · Variants: ${VVar.toLocaleString()}`;

    footerHTML = `
      <div class="mp-footer-bar">
        <span class="mp-freshness">Fetched ${escHtml(fetTime)} · ${escHtml(countsLine)}</span>
      </div>`;
  } else {
    const planLine = isPaid
      ? `Unlimited &nbsp;·&nbsp; <a href="https://makerpeek.com" target="_blank" rel="noopener">makerpeek.com</a>`
      : `Free plan: ${MP.FREE_LIMIT}/day &nbsp;·&nbsp; <a href="https://makerpeek.com/#pricing" target="_blank" rel="noopener">Get Pro ($11/mo) →</a>`;
    footerHTML = `<div class="mp-footer-simple">${planLine}</div>`;
  }

  const isDevMode = proCache?.source === "dev_override";
  const devToggleHTML = isDevMode && !devToggleUiHidden
    ? `<div class="mp-dev-toggle">
         <span>[DEV] Pro:</span>
         <button class="mp-dev-toggle-btn ${isPaid ? "active" : ""}" id="mp-dev-pro-on">ON</button>
         <span>|</span>
         <button class="mp-dev-toggle-btn ${!isPaid ? "active" : ""}" id="mp-dev-pro-off">OFF</button>
         <button type="button" class="mp-dev-toggle-hide" id="mp-dev-hide" title="Hide for screenshots. Alt+Shift+P toggles Free/Pro, Alt+Shift+D shows bar">Hide</button>
       </div>`
    : "";

  // ── Assemble ──────────────────────────────────────────────────────────────
  panelEl.innerHTML = `
    <div class="mp-header">
      <div class="mp-header-left">
        <div class="mp-brand">MakerPeek</div>
        <div class="mp-domain">${escHtml(domain)}</div>
        <div class="mp-tagline">Shopify store research</div>
      </div>
      <div class="mp-header-right">
        ${watchStoreBtn}
        <button class="mp-close" aria-label="Close panel">✕</button>
      </div>
    </div>
    <div class="mp-body-wrap">
      <div class="mp-body" id="mp-body">${bodyHTML}</div>
    </div>
    <div class="mp-footer">${footerHTML}${devToggleHTML}</div>`;

  // ── Post-render wiring ────────────────────────────────────────────────────

  // Close
  panelEl.querySelector(".mp-close").addEventListener("click", () => {
    panelOpen = false;
    panelEl.classList.remove("open");
  });

  const watchBtn = panelEl.querySelector("#mp-watch-store");
  if (watchBtn) {
    watchBtn.addEventListener("click", async () => {
      if (!isPaid) {
        sendUpgrade("watchlist");
        return;
      }

      const domain = detectionData?.storeDomain || location.hostname;
      const currentlyWatching = watchlistCache?.watching ?? false;

      if (currentlyWatching) {
        if (!confirm(`Remove ${domain} from your watchlist?`)) return;
        const res = await sendWatchlistMessage({ type: "WATCHLIST_REMOVE", domain });
        if (res?.ok !== false) {
          watchlistCache = { watching: false };
          watchBtn.textContent = "★ Add to Watchlist";
          watchBtn.disabled = false;
          watchBtn.classList.remove("mp-watch-btn--active");
          watchBtn.title = "Add this store to your watchlist";
          showToast(`Removed ${domain} from watchlist`);
        }
      } else {
        const snapshot = productsCache
          ? buildSlimSnapshotInline(productsCache, auditCache?.fetchedAt)
          : null;
        const res = await sendWatchlistMessage({ type: "WATCHLIST_ADD", domain, snapshot });
        if (res?.ok) {
          watchlistCache = { watching: true };
          watchBtn.textContent = "★ Added to Watchlist";
          watchBtn.disabled = true;
          watchBtn.classList.add("mp-watch-btn--active");
          watchBtn.title = "This store is on your watchlist";
          showToast(`Added ${domain} to watchlist`);
        } else if (res?.reason === "limit_reached") {
          showToast("Watchlist full (25 stores max)");
        } else if (res?.reason === "not_pro") {
          sendUpgrade("watchlist");
        }
      }
    });
  }

  // Cadence sparkline toggle (recent ↔ lifetime)
  const cadenceToggleBtn = panelEl.querySelector("#mp-cadence-toggle");
  if (cadenceToggleBtn) cadenceToggleBtn.addEventListener("click", handleCadenceToggle);

  // Non-shopify retry button
  const retryBtn = panelEl.querySelector("#mp-retry");
  if (retryBtn) {
    retryBtn.addEventListener("click", () => {
      window.__makerpeekDetected = null;
      window._mpDetectPromise    = null;
      detectionData = null;
      dataCache     = null;
      renderPanel("loading", null, "Retrying detection…");
      detectShopify().then((result) => {
        detectionData = result;
        routePanel();
      });
    });
  }

  // Proof icon tooltips - populate shared fixed tooltip on click
  const sharedTip = shadowRoot?.getElementById("mp-shared-tooltip");
  if (sharedTip) {
    panelEl.querySelectorAll(".mp-proof-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        // Toggle off if same button clicked twice
        if (!sharedTip.hidden && sharedTip._lastBtn === btn) {
          sharedTip.hidden = true;
          return;
        }
        // Populate from data attributes
        sharedTip.innerHTML = `
          <div class="mp-tip-body">${escHtml(btn.dataset.tipText || "")}</div>
          ${btn.dataset.tipVerify ? `<a class="mp-tip-verify" href="${escHtml(btn.dataset.tipVerify)}" target="_blank" rel="noopener">Open raw data ↗</a>` : ""}`;
        sharedTip._lastBtn = btn;
        sharedTip.hidden = false;
        positionTooltip(btn, sharedTip);
      });
    });
  }

  const mpThemeExpand = panelEl.querySelector("#mp-theme-expand-btn");
  if (mpThemeExpand && themeProfileUICache?.expandable) {
    mpThemeExpand.addEventListener("click", (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      const expanded = mpThemeExpand.getAttribute("aria-expanded") === "true";
      mpThemeExpand.setAttribute("aria-expanded", expanded ? "false" : "true");
      mpThemeExpand.classList.toggle("mp-theme-expand-btn--open", !expanded);
    });
  }

  // Diff row expand/collapse
  panelEl.querySelectorAll(".mp-diff-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const key   = btn.dataset.diffKey;
      const items = panelEl.querySelector(`#mp-diff-${key}`);
      const caret = btn.querySelector(".mp-diff-caret");
      if (!items) return;
      items.hidden = !items.hidden;
      if (caret) caret.textContent = items.hidden ? "▾" : "▴";
    });
  });

  // Variant options expand/collapse
  panelEl.querySelectorAll(".mp-opt-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx      = btn.dataset.opt;
      const expanded = btn.dataset.expanded === "true";
      const preview  = panelEl.querySelector(`#mp-opt-preview-${idx}`);
      const allDiv   = panelEl.querySelector(`#mp-opt-all-${idx}`);
      if (!preview || !allDiv) return;
      preview.hidden = !expanded;
      allDiv.hidden  = expanded;
    });
  });

  // Product classification lists (digital / POD)
  panelEl.querySelectorAll(".mp-product-reason-show").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.kind;
      const fold = panelEl.querySelector(`#mp-${kind}-reason-fold`);
      if (!fold) return;
      const expanded = btn.dataset.expanded === "true";
      fold.hidden    = expanded;
      btn.dataset.expanded = expanded ? "false" : "true";
      btn.textContent = expanded ? "Show products ▾" : "Hide products ▴";
    });
  });

  panelEl.querySelectorAll(".mp-product-expand-all-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const kind = btn.dataset.kind;
      const fold = panelEl.querySelector(`#mp-${kind}-reason-fold`);
      if (!fold) return;
      fold.querySelectorAll(".mp-product-reason-item[data-mp-collapsed-extra]").forEach((row) => {
        row.hidden = false;
      });
      btn.remove();
    });
  });

  // Skeleton "Unlock with Pro" buttons
  panelEl.querySelectorAll(".pro-cta[data-action='upgrade']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const section = btn.closest(".mp-section");
      const titleEl = section?.querySelector(".mp-section-title");
      const feature = titleEl?.textContent?.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z_]/g, "") || "pro_feature";
      sendUpgrade(feature);
    });
  });

  // Inline "unlock with Pro" links
  panelEl.querySelectorAll(".mp-accent-link").forEach((el) => {
    el.addEventListener("click", () => sendUpgrade(el.dataset.feature || "pro_feature"));
  });

  wirePanelUpgradeLinks(panelEl);
  wireBestsellersCollapseToggle(panelEl);

  // Total variants inline gated row
  const tvGated = panelEl.querySelector(".mp-tv-gated");
  if (tvGated) {
    tvGated.addEventListener("click", () => sendUpgrade("total_variants"));
  }

  // Section error-boundary retries (full reload)
  panelEl.querySelectorAll(".mp-section-retry-btn").forEach((btn) => {
    btn.addEventListener("click", () => fetchAndRender());
  });

  panelEl.querySelectorAll(".mp-products-fetch-retry-btn").forEach((btn) => {
    btn.addEventListener("click", () => fetchAndRender());
  });

  panelEl.querySelector("#mp-apps-expand")?.addEventListener("click", () => {
    mpAppsStackExpanded = true;
    renderPanel("loaded");
  });
  panelEl.querySelector("#mp-apps-collapse")?.addEventListener("click", () => {
    mpAppsStackExpanded = false;
    renderPanel("loaded");
  });

  const devOnBtn  = panelEl.querySelector("#mp-dev-pro-on");
  const devOffBtn = panelEl.querySelector("#mp-dev-pro-off");
  const devHideBtn = panelEl.querySelector("#mp-dev-hide");
  if (devOnBtn && devOffBtn) {
    devOnBtn.addEventListener("click", async () => {
      await applyDevProOverride(true);
    });
    devOffBtn.addEventListener("click", async () => {
      await applyDevProOverride(false);
    });
  }
  if (devHideBtn) {
    devHideBtn.addEventListener("click", async () => {
      await setDevToggleUiHidden(true);
      showToast("Dev bar hidden. Alt+Shift+P Free/Pro, Alt+Shift+D show");
      if (dataCache) renderPanel("loaded");
      else if (isConfirmedShopify(detectionData)) renderPanel("idle");
    });
  }

  // Pro products expand toggle
  const productsExpandBtn = panelEl.querySelector("#mp-products-expand-btn");
  const productsCollapsed = panelEl.querySelector("#mp-products-collapsed");
  const productsExpanded  = panelEl.querySelector("#mp-products-expanded");
  if (productsExpandBtn && productsCollapsed && productsExpanded) {
    productsExpandBtn.addEventListener("click", () => {
      productsCollapsed.hidden = true;
      productsExpanded.hidden  = false;
      const searchInput = productsExpanded.querySelector("#mp-product-search");
      const listBody    = productsExpanded.querySelector("#mp-product-list-body");
      if (searchInput && listBody) {
        renderProductList(listBody, "");
        searchInput.addEventListener("input", () => renderProductList(listBody, searchInput.value));
      }
    });
  }

  // Pro product search (fallback if expanded immediately - unlikely but defensive)
  const searchInput = panelEl.querySelector("#mp-product-search");
  const listBody    = panelEl.querySelector("#mp-product-list-body");
  if (searchInput && listBody && !productsExpanded?.hidden) {
    renderProductList(listBody, "");
    searchInput.addEventListener("input", () => renderProductList(listBody, searchInput.value));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function buildCSS() {
  const { FOREST, FOREST_DARK, CREAM, CREAM_DARK, INK, INK_SOFT, BEIGE, WHITE, GOLD, RED } = MP;
  return `
    :host { all: initial; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    #mp-toggle {
      position: fixed; bottom: 24px; right: 24px;
      width: 40px; height: 40px; border-radius: 8px;
      background: ${FOREST}; border: none; cursor: pointer;
      box-shadow: 0 2px 12px rgba(0,0,0,0.28);
      display: flex; align-items: center; justify-content: center;
      pointer-events: all; transition: background 0.15s, transform 0.15s; z-index: 2147483647;
    }
    #mp-toggle:hover { background: ${FOREST_DARK}; transform: scale(1.07); }
    .mp-m {
      color: ${CREAM}; font-family: Georgia, 'Times New Roman', Times, serif;
      font-size: 18px; font-weight: 700; line-height: 1; user-select: none;
    }

    #mp-panel {
      position: fixed; top: 0; right: 0; width: 380px; height: 100%;
      background: ${CREAM}; box-shadow: -4px 0 32px rgba(0,0,0,0.16);
      display: flex; flex-direction: column;
      transform: translateX(100%); transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none; overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', ui-sans-serif, sans-serif;
      font-size: 13px; color: ${INK}; z-index: 2147483646;
    }
    #mp-panel.open { transform: translateX(0); pointer-events: all; }

    /* Header */
    .mp-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      padding: 14px 16px 12px; background: ${FOREST}; flex-shrink: 0; gap: 8px;
    }
    .mp-header-left { flex: 1; min-width: 0; }
    .mp-header-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .mp-brand { font-family: Georgia, serif; font-size: 15px; font-weight: 700; color: ${CREAM}; letter-spacing: -0.2px; }
    .mp-domain { font-size: 11px; color: rgba(251,247,242,0.65); margin-top: 2px; }
    .mp-close {
      background: none; border: none; color: rgba(251,247,242,0.6);
      cursor: pointer; font-size: 13px; padding: 2px 4px; border-radius: 4px; line-height: 1; transition: color 0.1s;
    }
    .mp-close:hover { color: ${CREAM}; }
    .mp-save-btn {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25);
      color: ${CREAM}; cursor: pointer; font-size: 11px; font-weight: 600;
      padding: 4px 9px; border-radius: 6px; white-space: nowrap;
      transition: background 0.15s; display: flex; align-items: center; gap: 4px;
    }
    .mp-save-btn:hover { background: rgba(255,255,255,0.22); }
    .mp-save-btn:disabled { opacity: 0.55; cursor: default; }
    .mp-watch-btn--active {
      background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.18);
      opacity: 0.7;
    }
    .mp-watch-btn--active:hover { background: rgba(255,255,255,0.18); opacity: 1; }

    /* Toast */
    .mp-toast {
      position: fixed; bottom: 72px; right: 24px; z-index: 2147483647;
      background: ${INK}; color: ${CREAM}; font-size: 12px; font-weight: 500;
      padding: 8px 14px; border-radius: 8px; pointer-events: none;
      opacity: 0; transform: translateY(6px);
      transition: opacity 0.2s ease, transform 0.2s ease;
      max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .mp-toast--visible { opacity: 1; transform: translateY(0); }

    /* Badges + gates */
    .mp-pro-badge {
      font-size: 8px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
      color: ${FOREST}; background: ${CREAM_DARK}; border-radius: 99px; padding: 1px 5px; line-height: 1.4;
    }
    .mp-gate-btn { opacity: 0.85; }

    /* Skeleton placeholders */
    .skeleton-wrap { position: relative; min-height: 120px; }
    .skeleton-rows { display: flex; flex-direction: column; gap: 10px; padding: 8px 0; }
    .skeleton-row { display: flex; align-items: center; gap: 12px; }
    .skeleton-row.product { gap: 10px; }
    .skeleton-label,
    .skeleton-bar,
    .skeleton-value,
    .skeleton-line,
    .skeleton-thumb,
    .skeleton-inline-value,
    .skeleton-chips span {
      background: #E5DFD0; border-radius: 3px; position: relative; overflow: hidden; flex-shrink: 0;
    }
    .skeleton-label { height: 10px; width: 100px; }
    .skeleton-bar { height: 10px; flex: 1; flex-shrink: 1; }
    .skeleton-value { height: 12px; width: 40px; margin-left: auto; }
    .skeleton-line { height: 10px; width: 100%; }
    .skeleton-line.short { height: 8px; }
    .skeleton-thumb { width: 32px; height: 32px; }
    .skeleton-inline-value { display: inline-block; height: 14px; width: 60px; vertical-align: middle; }
    .skeleton-chips { display: flex; gap: 6px; flex: 1; }
    .skeleton-chips span { height: 18px; width: 40px; flex-shrink: 0; }
    .skeleton-text-block { flex: 1; display: flex; flex-direction: column; gap: 6px; }
    /* Shimmer animation */
    .skeleton-label::after, .skeleton-bar::after, .skeleton-value::after,
    .skeleton-line::after, .skeleton-thumb::after, .skeleton-inline-value::after,
    .skeleton-chips span::after {
      content: ''; position: absolute; top: 0; left: -100%; width: 100%; height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: mp-shimmer 1.8s infinite;
    }
    @keyframes mp-shimmer { to { left: 100%; } }
    /* Pro overlay on skeletons */
    .pro-overlay {
      position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
      background: linear-gradient(180deg, rgba(251,247,242,0.4), rgba(251,247,242,0.95));
    }
    .pro-cta {
      background: ${FOREST}; color: ${CREAM}; border: none; padding: 10px 18px;
      border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
    }
    .pro-cta:hover { background: ${FOREST_DARK}; }

    /* Body */
    /* Capped banner */

    .mp-tagline {
      font-size: 10px; color: rgba(251,247,242,0.55); margin-top: 1px;
      letter-spacing: 0.02em;
    }
    .mp-blocked-banner {
      display: flex; gap: 12px; align-items: flex-start;
      background: #F4EEE5; border-left: 3px solid ${FOREST};
      padding: 16px; margin-bottom: 12px; border-radius: 0 7px 7px 0;
    }
    .mp-blocked-icon { flex-shrink: 0; color: ${FOREST}; margin-top: 1px; }
    .mp-blocked-title { font-size: 13px; font-weight: 600; color: ${INK}; margin-bottom: 4px; }
    .mp-blocked-body { font-size: 12px; color: ${INK_SOFT}; line-height: 1.45; }
    .mp-section-subhead {
      font-size: 11px; color: #7A746C; margin-bottom: 8px; margin-top: -4px;
    }
    .mp-bestsellers-list { list-style: none; padding: 0; margin: 0; }
    .mp-bestsellers-list.mp-bestsellers--collapsed > li:nth-child(n+6) {
      display: none;
    }
    .mp-bestsellers-toggle {
      display: block; width: 100%; margin-top: 6px; padding: 4px 0;
      background: none; border: none; cursor: pointer;
      font-size: 11px; font-weight: 500; color: ${INK_SOFT}; text-align: left;
    }
    .mp-bestsellers-toggle:hover { color: ${INK}; text-decoration: underline; }
    .mp-bestseller-row {
      display: flex; align-items: center; gap: 10px; padding: 8px 0;
      text-decoration: none; color: inherit; border-bottom: 1px solid #F4EEE5;
      transition: background 0.1s;
    }
    .mp-bestseller-row:last-child { border-bottom: none; }
    .mp-bestseller-row:hover { background: #F4EEE5; }
    .mp-bestseller-rank {
      font-family: 'Fraunces', Georgia, serif; font-size: 15px;
      color: ${FOREST}; font-weight: 600; width: 22px; text-align: right; flex-shrink: 0;
    }
    .mp-bestseller-main {
      flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0;
    }
    .mp-bestseller-title {
      font-size: 12px; color: ${INK}; white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; font-weight: 500;
    }
    .mp-bestseller-price { font-size: 11px; color: ${INK_SOFT}; }
    .mp-bestseller-compare { color: #7A746C; margin-left: 4px; }
    .mp-bestseller-arrow {
      color: #7A746C; flex-shrink: 0; opacity: 0; transition: opacity 0.15s;
    }
    .mp-bestseller-row:hover .mp-bestseller-arrow { opacity: 1; }
    .mp-app-category { margin-bottom: 12px; }
    .mp-app-category:last-child { margin-bottom: 0; }
    .mp-app-category-label {
      font-size: 10px; color: #7A746C; text-transform: uppercase;
      letter-spacing: 0.05em; margin-bottom: 4px; font-weight: 600;
    }
    .mp-app-list { list-style: none; padding: 0; margin: 0; }
    .mp-app-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 6px 0; font-size: 12px; color: ${INK};
    }
    .mp-app-confirmed {
      font-size: 10px; color: ${FOREST}; background: #F4EEE5;
      padding: 2px 8px; border-radius: 10px;
    }
    .mp-price-bars { display: flex; flex-direction: column; gap: 6px; }
    .mp-price-bar-row {
      display: flex; align-items: center; gap: 10px; font-size: 11px;
    }
    .mp-price-bar-label {
      width: 60px; color: ${INK_SOFT}; font-variant-numeric: tabular-nums;
    }
    .mp-price-bar-track {
      flex: 1; height: 8px; background: #F4EEE5; border-radius: 4px; overflow: hidden;
    }
    .mp-price-bar-fill {
      height: 100%; background: ${FOREST}; border-radius: 4px; transition: width 0.3s ease;
    }
    .mp-price-bar-count {
      width: 40px; text-align: right; font-size: 11px; color: ${INK_SOFT};
      font-variant-numeric: tabular-nums;
    }
    .mp-upsell {
      padding: 10px 12px; background: #F4EEE5; font-size: 12px; color: ${INK_SOFT};
      text-align: center; border-radius: 6px; margin-top: 8px;
    }
    .mp-upgrade {
      color: ${FOREST}; text-decoration: none; font-weight: 500;
    }
    .mp-upgrade:hover { text-decoration: underline; }

    .mp-capped-banner {
      background: #FEF9E7; border: 1px solid #F5CBA7; border-radius: 7px;
      padding: 8px 12px; font-size: 11px; color: #7D6608; margin-bottom: 10px;
    }
    .mp-products-fetch-banner {
      background: #FDEFC8; border: 1px solid #E8A849; border-radius: 7px;
      padding: 8px 12px; font-size: 11px; color: #6B4423; margin-bottom: 10px; line-height: 1.45;
    }

    /* Footer */
    .mp-footer {
      border-top: 1px solid ${BEIGE}; flex-shrink: 0;
      background: ${CREAM}; font-size: 11px; color: ${INK_SOFT};
    }
    .mp-footer-bar {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 14px 6px; gap: 8px;
    }
    .mp-freshness { font-size: 10px; color: ${INK_SOFT}; }
    .mp-breakdown-btn {
      background: none; border: none; color: ${FOREST}; font-size: 10px; font-weight: 600;
      cursor: pointer; padding: 0; white-space: nowrap; flex-shrink: 0;
    }
    .mp-breakdown-btn:hover { text-decoration: underline; }
    .mp-breakdown {
      padding: 6px 14px 8px; border-top: 1px solid ${BEIGE}; background: #f8f4ef;
    }
    .mp-breakdown-pre {
      font-size: 10px; color: ${INK_SOFT}; line-height: 1.6;
      white-space: pre; font-family: monospace; margin-bottom: 6px;
    }
    .mp-breakdown-divider { height: 1px; background: ${BEIGE}; margin-bottom: 6px; }
    .mp-breakdown-summary { font-size: 10px; color: ${INK_SOFT}; }
    .mp-footer-actions {
      display: flex; align-items: center; justify-content: space-between;
      padding: 7px 14px 10px; gap: 10px; border-top: 1px solid ${BEIGE};
    }
    .mp-csv-btn {
      background: ${WHITE}; border: 1.5px solid ${BEIGE}; color: ${INK};
      border-radius: 7px; padding: 5px 12px; font-size: 11px; font-weight: 600;
      cursor: pointer; transition: background 0.15s;
      display: flex; align-items: center; gap: 4px; flex-shrink: 0;
    }
    .mp-csv-btn:hover { background: ${CREAM_DARK}; }
    .mp-plan-status { font-size: 10px; color: ${INK_SOFT}; text-align: right; }
    .mp-plan-status a { color: ${FOREST}; font-weight: 600; text-decoration: none; }
    .mp-plan-status a:hover { text-decoration: underline; }
    .mp-footer-simple { padding: 10px 14px; font-size: 11px; color: ${INK_SOFT}; }
    .mp-footer-simple a { color: ${FOREST}; font-weight: 600; text-decoration: none; }
    .mp-footer-simple a:hover { text-decoration: underline; }

    /* Dev toggle */
    .mp-dev-toggle {
      display: flex; align-items: center; gap: 6px; font-size: 10px; color: ${INK_SOFT};
      margin: 4px 12px 0; padding: 4px 8px;
      background: #FDEFC8; border: 1px dashed #C49B3A; border-radius: 4px;
    }
    .mp-dev-toggle-btn {
      background: none; border: none; cursor: pointer; font-size: 10px;
      font-weight: 600; color: ${INK_SOFT}; padding: 2px 6px; border-radius: 2px;
    }
    .mp-dev-toggle-btn.active {
      background: ${FOREST}; color: #FBF7F2;
    }
    .mp-dev-toggle-hide {
      margin-left: auto;
      background: none; border: none; cursor: pointer; font-size: 10px;
      font-weight: 600; color: ${INK_SOFT}; padding: 2px 6px; border-radius: 2px;
      text-decoration: underline;
    }
    .mp-dev-toggle-hide:hover { color: ${FOREST_DARK}; }

    /* Proof icons + tooltips */
    .mp-proof-wrap { display: inline-block; vertical-align: middle; margin-left: 3px; }
    .mp-proof-btn {
      background: none; border: none; cursor: pointer;
      font-size: 10px; color: ${FOREST}; padding: 0 1px;
      line-height: 1; opacity: 0.65; transition: opacity 0.1s;
      vertical-align: middle;
    }
    .mp-proof-btn:hover { opacity: 1; }
    /* Shared tooltip - position:fixed so it escapes panel overflow/clipping */
    .mp-proof-tip {
      position: fixed;
      min-width: 220px; max-width: 280px; width: max-content;
      background: ${INK}; color: ${CREAM}; border-radius: 8px; padding: 10px 12px;
      font-size: 10px; line-height: 1.5; z-index: 2147483647;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      pointer-events: auto;
    }
    #mp-shared-tooltip[hidden] { display: none; }
    .mp-tip-row { margin-bottom: 5px; }
    .mp-tip-row:last-of-type { margin-bottom: 0; }
    .mp-tip-key {
      display: inline-block; font-weight: 700; text-transform: uppercase;
      font-size: 8px; letter-spacing: 0.5px; color: rgba(251,247,242,0.6);
      margin-right: 4px; width: 42px;
    }
    .mp-tip-verify {
      display: inline-block; margin-top: 6px; color: ${CREAM};
      font-size: 10px; font-weight: 600; text-decoration: underline;
    }
    .mp-tip-body { font-weight: 500; margin: 0; }

    /* Section titles */
    .mp-section-title {
      font-size: 10px; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.7px; color: ${INK_SOFT}; margin: 14px 0 6px;
      display: flex; align-items: center; gap: 5px;
    }
    .mp-section-title--top { margin-top: 0; }

    /* Stats cards */
    .mp-stats-card { background: ${WHITE}; border: 1px solid ${BEIGE}; border-radius: 10px; overflow: hidden; }
    .mp-section-gap { margin-bottom: 4px; }
    .mp-stat-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 13px; border-bottom: 1px solid ${BEIGE};
    }
    .mp-stat-row--last { border-bottom: none; }
    .mp-stat-row--indent { padding-left: 26px; background: #FAFAF8; }
    .mp-stat-row--stack { align-items: flex-start; }
    .mp-stat-stack-val { flex-direction: column !important; align-items: flex-end !important; gap: 4px; }
    .mp-activity-sub {
      font-size: 10px;
      font-weight: 400;
      color: ${INK_SOFT};
      line-height: 1.25;
      width: 100%;
      text-align: right;
    }
    .mp-stat-label { color: ${INK_SOFT}; font-size: 12px; display: flex; align-items: center; gap: 4px; }
    .mp-stat-row--profile-str .mp-stat-label {
      align-items: flex-start;
      padding-top: 2px;
    }
    .mp-stat-value {
      font-weight: 600; font-size: 12px; text-align: right; color: ${INK}; display: flex;
      align-items: center; gap: 0; justify-content: flex-end;
      flex-wrap: wrap; flex: 1; min-width: 0;
    }
    .mp-stat-str-wrap {
      flex: 1;
      max-width: 100%;
      min-width: 0;
      text-align: right;
      justify-content: flex-end;
      display: inline-flex;
      flex-wrap: wrap;
      gap: 2px;
      align-items: center;
      word-break: break-word;
      color: inherit;
      font-weight: inherit;
    }
    .mp-stat-value--small { font-size: 11px; color: ${INK_SOFT}; font-weight: 500; }
    .mp-stat-value--profile { font-weight: 500; color: ${INK_SOFT}; align-items: flex-start !important; }
    .mp-stat-row--profile-str .mp-stat-value {
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 4px;
    }
    .mp-theme-profile-slot {
      flex: 1;
      display: inline-flex;
      flex-wrap: wrap;
      gap: 3px;
      align-items: flex-start;
      justify-content: flex-end;
      max-width: 100%;
      min-width: 0;
    }
    .mp-theme-expand-btn {
      flex: 1 1 auto;
      min-width: 0;
      margin: 0;
      padding: 0;
      border: none;
      background: none;
      color: inherit;
      font-size: inherit;
      font-family: inherit;
      font-weight: 500;
      text-align: right;
      cursor: pointer;
      color: ${INK_SOFT};
    }
    .mp-theme-expand-btn:hover {
      opacity: 0.95;
      color: ${INK};
      text-decoration: underline;
      text-underline-offset: 2px;
    }
    .mp-theme-expand-btn--static {
      cursor: default;
      display: inline;
      flex: 1 1 auto;
      max-width: 100%;
      min-width: 0;
    }
    .mp-theme-expand-btn--static:hover {
      opacity: inherit;
      text-decoration: none;
      color: ${INK_SOFT};
    }
    .mp-theme-expand-btn:not(.mp-theme-expand-btn--static):focus-visible {
      outline: 2px solid ${FOREST};
      outline-offset: 2px;
    }
    .mp-theme-body-text {
      max-width: 100%;
      line-height: 1.35;
      color: inherit;
    }
    .mp-theme-expand-btn:not(.mp-theme-expand-btn--static):not(.mp-theme-expand-btn--open) .mp-theme-body-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
      white-space: normal;
    }
    .mp-theme-expand-btn--open .mp-theme-body-text {
      display: block;
      -webkit-line-clamp: unset;
      overflow: visible;
      word-break: break-word;
      white-space: normal;
    }
    .mp-theme-expand-btn--static .mp-theme-body-text,
    .mp-theme-body-text.mp-theme-body-text--compact {
      display: block;
      overflow: visible;
      word-break: break-word;
      white-space: normal;
    }
    .mp-theme-tip {
      font-size: 10px;
      color: ${FOREST};
      opacity: 0.55;
      flex-shrink: 0;
      line-height: 1.25;
      margin-top: 1px;
      word-break: break-word;
    }
    .mp-theme-tip:hover { opacity: 1; cursor: help; }
    .mp-note { font-size: 10px; font-weight: 400; color: ${INK_SOFT}; }
    .mp-visible-fallback-note .mp-sub {
      padding: 0 2px 8px;
      margin-top: -2px;
      line-height: 1.35;
    }
    .mp-catalog-fallback-warn {
      display: inline-block;
      font-size: 12px;
      line-height: 1;
      color: ${GOLD};
      cursor: help;
      vertical-align: middle;
      margin-left: 2px;
    }
    .mp-accent { color: ${FOREST}; }
    .mp-accent-link { color: ${FOREST}; cursor: pointer; text-decoration: underline; font-weight: 600; }
    .mp-sub { font-size: 11px; opacity: 0.7; margin-top: 4px; }

    /* App stack */
    .mp-app-empty { padding: 6px 0; }
    .mp-app-stack-list {
      padding: 0 2px;
    }
    .mp-app-stack-row {
      padding: 8px 0;
      border-bottom: 1px solid ${BEIGE};
    }
    .mp-app-stack-row:last-child { border-bottom: none; }
    .mp-app-stack-head {
      display: flex; align-items: center; gap: 6px;
      justify-content: space-between;
      margin-bottom: 3px;
    }
    .mp-app-stack-name { font-size: 12px; font-weight: 600; color: ${INK}; flex: 1; min-width: 0; }
    .mp-app-stack-meta {
      display: flex; flex-wrap: wrap; gap: 6px;
      align-items: baseline;
    }
    .mp-app-stack-meta .mp-app-cat {
      font-size: 10px; color: ${INK_SOFT}; white-space: nowrap;
    }
    .mp-app-stack-hint {
      font-size: 10px; color: ${INK_SOFT}; line-height: 1.35; flex-basis: 100%;
    }
    .mp-app-conf {
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.2px;
      text-transform: none;
      padding: 2px 6px;
      border-radius: 99px;
      flex-shrink: 0;
      white-space: nowrap;
    }
    .mp-app-conf--confirmed { background: ${FOREST}; color: ${CREAM}; }
    .mp-app-conf--likely { background: #FFE8BF; color: #7A5410; }
    .mp-app-conf--possible { background: ${BEIGE}; color: ${INK_SOFT}; }

    /* Row cards */
    .mp-section { margin-bottom: 4px; }
    .mp-row-card {
      display: flex; justify-content: space-between; align-items: center;
      padding: 7px 11px; border-radius: 7px; background: ${WHITE};
      border: 1px solid ${BEIGE}; margin-bottom: 4px; font-size: 12px;
    }
    .mp-row-card--product { gap: 6px; }
    .mp-row-main { color: ${INK}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 220px; flex: 1; }
    .mp-row-side { color: ${INK_SOFT}; font-variant-numeric: tabular-nums; flex-shrink: 0; }
    .mp-row-price { color: ${FOREST}; font-weight: 600; white-space: nowrap; flex-shrink: 0; margin-left: 4px; }
    .mp-show-more {
      display: block; width: 100%; text-align: center; padding: 6px 0;
      background: none; border: none; cursor: pointer; font-size: 11px;
      color: ${FOREST}; text-decoration: underline; margin-top: 2px;
    }
    .mp-show-more:hover { color: ${FOREST_DARK}; }

    .mp-coll-total-tip { cursor: help; border-bottom: 1px dotted ${INK_SOFT}; }
    .mp-coll-merch-panel { margin-top: 6px; padding-top: 8px; border-top: 1px dashed ${BEIGE}; }
    .mp-coll-merch-hint { margin-bottom: 6px; }
    .mp-row-card--merch { opacity: 0.95; }

    /* Stock indicators */
    .mp-stock-legend {
      display: flex; gap: 12px; padding: 4px 0 8px; flex-wrap: wrap;
    }
    .mp-stock-dot {
      font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px;
    }
    .mp-stock-dot::before { content: "●"; font-size: 7px; line-height: 1; }
    .mp-stock-dot--sm { font-size: 9px; flex-shrink: 0; }
    .mp-stock-in      { color: ${FOREST}; }
    .mp-stock-partial { color: ${GOLD}; }
    .mp-stock-oos     { color: ${RED}; }
    .mp-stock-unknown { color: ${INK_SOFT}; }

    /* Sparkline */
    .mp-spark-wrap { padding: 8px 2px 4px; }

    /* Calendar heatmap (lifetime view) */
    .calendar { display: flex; flex-direction: column; gap: 2px; padding: 8px 0; }
    .calendar-header, .calendar-row {
      display: grid;
      grid-template-columns: 36px repeat(12, 1fr);
      gap: 2px; align-items: center;
    }
    .calendar-year-label { font-size: 10px; color: ${INK_SOFT}; font-weight: 600; }
    .calendar-month-label { font-size: 9px; color: ${INK_SOFT}; text-align: center; }
    .calendar-cell {
      aspect-ratio: 1; border-radius: 2px; background: ${BEIGE};
      display: flex; align-items: center; justify-content: center;
      font-size: 9px; font-weight: 600; color: ${INK};
    }
    .calendar-cell.cal-empty  { background: ${BEIGE}; color: transparent; }
    .calendar-cell.cal-future { background: transparent; }
    .calendar-cell.cal-l1 { background: #C4D0BC; }
    .calendar-cell.cal-l2 { background: #8FA887; color: #FBF7F2; }
    .calendar-cell.cal-l3 { background: #5E7B57; color: #FBF7F2; }
    .calendar-cell.cal-l4 { background: ${FOREST}; color: #FBF7F2; }
    .mp-cadence-actions { padding: 4px 0 2px; }
    .mp-cadence-toggle {
      background: none; border: none; cursor: pointer;
      font-size: 11px; color: ${FOREST}; padding: 0; text-decoration: underline;
    }
    .mp-cadence-toggle:hover { color: ${FOREST_DARK}; }
    .mp-cadence-toggle--gated { color: ${INK_SOFT}; }

    /* Bar chart (price distribution) */
    .mp-bar-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; font-size: 11px; }
    .mp-bar-label { color: ${INK_SOFT}; width: 80px; flex-shrink: 0; white-space: nowrap; }
    .mp-bar-track { flex: 1; height: 8px; background: ${BEIGE}; border-radius: 99px; overflow: hidden; }
    .mp-bar-fill { height: 100%; background: ${FOREST}; border-radius: 99px; min-width: 2px; }
    .mp-bar-count { color: ${INK}; font-weight: 600; width: 32px; text-align: right; flex-shrink: 0; }

    /* Variant options */
    .mp-opt-row { padding: 7px 0; border-bottom: 1px solid ${BEIGE}; }
    .mp-opt-row:last-child { border-bottom: none; }
    .mp-opt-name { font-weight: 600; font-size: 12px; color: ${INK}; }
    .mp-opt-count { font-size: 11px; color: ${INK_SOFT}; margin-left: 6px; }
    .mp-opt-samples { display: block; font-size: 11px; color: ${INK_SOFT}; margin-top: 2px; }

    /* Product search */
    .mp-search-input {
      width: 100%; padding: 7px 11px; border: 1px solid ${BEIGE}; border-radius: 7px;
      font-size: 12px; background: ${WHITE}; color: ${INK}; outline: none; margin-bottom: 6px;
    }
    .mp-search-input:focus { border-color: ${FOREST}; box-shadow: 0 0 0 2px rgba(61,89,68,0.15); }

    /* Product list */
    .mp-product-row {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 8px; border-radius: 7px; background: ${WHITE};
      border: 1px solid ${BEIGE}; margin-bottom: 4px;
    }
    .mp-product-thumb { width: 36px; height: 36px; border-radius: 5px; object-fit: cover; flex-shrink: 0; }
    .mp-thumb-ph { background: ${BEIGE}; }
    .mp-product-info { flex: 1; min-width: 0; }
    .mp-product-title-line {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      flex-wrap: wrap;
    }
    .mp-product-title {
      font-size: 12px;
      font-weight: 600;
      color: ${INK};
      flex: 1 1 auto;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mp-product-color-badge {
      flex-shrink: 0;
      font-size: 10px;
      font-weight: 600;
      color: ${INK_SOFT};
      background: rgba(61,89,68,0.06);
      border-radius: 4px;
      padding: 2px 5px;
    }
    .mp-product-meta { font-size: 10px; color: ${INK_SOFT}; margin-top: 1px; }
    .mp-product-row--link {
      text-decoration: none;
      color: inherit;
      cursor: pointer;
      transition: border-color 0.12s, box-shadow 0.12s;
    }
    .mp-product-row--link:hover {
      border-color: ${FOREST};
      box-shadow: 0 1px 0 rgba(61,89,68,0.08);
    }

    /* States */
    .mp-center-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 12px; padding: 48px 0; color: ${INK_SOFT}; text-align: center;
    }
    .mp-empty-state { padding: 48px 0; text-align: center; color: ${INK_SOFT}; }
    .mp-error-state { color: #b91c1c; }
    .mp-spinner {
      width: 22px; height: 22px; border: 2px solid ${BEIGE}; border-top-color: ${FOREST};
      border-radius: 50%; animation: mp-spin 0.7s linear infinite;
    }
    @keyframes mp-spin { to { transform: rotate(360deg); } }

    /* Non-shopify states */
    .mp-ns-state {
      display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: 10px; padding: 48px 20px; text-align: center;
    }
    .mp-ns-icon { font-size: 28px; line-height: 1; }
    .mp-ns-title { font-size: 14px; font-weight: 600; color: ${INK}; }
    .mp-ns-detail { font-size: 12px; color: ${INK_SOFT}; font-variant-numeric: tabular-nums; }
    .mp-ns-text { font-size: 12px; color: ${INK_SOFT}; max-width: 280px; line-height: 1.5; }
    .mp-ns-actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: center; }
    .mp-ns-retry-btn {
      background: ${FOREST}; color: ${CREAM}; border: none; cursor: pointer;
      font-size: 12px; font-weight: 600; padding: 6px 14px; border-radius: 99px;
    }
    .mp-ns-diag-btn {
      background: none; border: 1px solid ${BEIGE}; color: ${INK_SOFT}; cursor: pointer;
      font-size: 12px; padding: 6px 14px; border-radius: 99px;
    }
    .mp-ns-diag-btn:hover { border-color: ${FOREST}; color: ${FOREST}; }

    /* Diagnostics panel */
    .mp-diag-panel {
      flex-shrink: 0; border-top: 1px solid ${BEIGE}; background: ${CREAM_DARK};
      max-height: 300px; overflow-y: auto; font-size: 11px;
      scrollbar-width: thin; scrollbar-color: ${BEIGE} transparent;
    }
    .mp-diag-header {
      font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
      color: ${INK_SOFT}; padding: 8px 12px 4px;
    }
    .mp-diag-inner { padding: 0 12px 10px; }
    .mp-diag-row {
      display: flex; justify-content: space-between; align-items: baseline;
      padding: 3px 0; border-bottom: 1px solid rgba(0,0,0,0.05); gap: 8px;
    }
    .mp-diag-indent { padding-left: 12px; }
    .mp-diag-key { color: ${INK_SOFT}; flex-shrink: 0; }
    .mp-diag-val { color: ${INK}; text-align: right; word-break: break-all; }
    .mp-diag-true  { color: ${FOREST}; font-weight: 600; }
    .mp-diag-false { color: ${RED}; }
    .mp-diag-heading {
      font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px;
      color: ${INK_SOFT}; padding: 6px 0 2px;
    }
    .mp-diag-copy-btn {
      margin-top: 8px; width: 100%; background: ${FOREST}; color: ${CREAM};
      border: none; cursor: pointer; font-size: 11px; font-weight: 600;
      padding: 7px 12px; border-radius: 6px; transition: background 0.15s;
    }
    .mp-diag-copy-btn:hover { background: ${FOREST_DARK}; }

    /* Diagnostics footer row */
    .mp-footer-diag-row {
      display: flex; justify-content: flex-end; padding: 5px 12px 4px;
      border-top: 1px solid ${BEIGE};
    }
    .mp-diag-link {
      background: none; border: none; cursor: pointer; font-size: 10px;
      color: ${INK_SOFT}; text-decoration: underline; padding: 0;
    }
    .mp-diag-link:hover { color: ${FOREST}; }

    /* mp-body-wrap: wraps mp-body and mp-glossary, flex sibling of header/footer */
    .mp-body-wrap {
      flex: 1; overflow: hidden; position: relative; display: flex; flex-direction: column;
    }
    .mp-body, .mp-glossary {
      flex: 1; overflow-y: auto; padding: 14px 14px 12px;
      scrollbar-width: thin; scrollbar-color: ${BEIGE} transparent;
    }
    .mp-body::-webkit-scrollbar, .mp-glossary::-webkit-scrollbar { width: 5px; }
    .mp-body::-webkit-scrollbar-thumb, .mp-glossary::-webkit-scrollbar-thumb { background: ${BEIGE}; border-radius: 4px; }

    /* Glossary button in header */
    .mp-glossary-btn {
      background: rgba(255,255,255,0.12); border: 1px solid rgba(255,255,255,0.25);
      color: ${CREAM}; cursor: pointer; font-size: 12px; font-weight: 700;
      width: 24px; height: 24px; border-radius: 50%; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.15s; flex-shrink: 0;
    }
    .mp-glossary-btn:hover, .mp-glossary-btn--active { background: rgba(255,255,255,0.28); }

    /* Glossary content */
    .mp-glossary-inner { padding: 0; }
    .mp-gloss-nav { padding: 0 0 10px; }
    .mp-gloss-back {
      background: none; border: none; cursor: pointer; color: ${FOREST};
      font-size: 11px; font-weight: 600; padding: 0; text-decoration: underline;
    }
    .mp-gloss-title {
      font-size: 13px; font-weight: 700; color: ${INK}; margin-bottom: 14px;
      font-family: Georgia, serif;
    }
    .mp-gloss-section { margin-bottom: 14px; }
    .mp-gloss-heading {
      font-size: 9px; font-weight: 700; letter-spacing: 0.7px; text-transform: uppercase;
      color: ${INK_SOFT}; margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px solid ${BEIGE};
    }
    .mp-gloss-row { display: flex; gap: 8px; padding: 3px 0; }
    .mp-gloss-term {
      flex-shrink: 0; width: 130px; font-size: 11px; font-weight: 600; color: ${INK};
    }
    .mp-gloss-def { font-size: 11px; color: ${INK_SOFT}; line-height: 1.5; }

    /* Flexbox cadence bar chart */
    .cadence {
      display: flex; gap: 4px; align-items: flex-end;
      padding: 4px 0 0; min-height: 60px;
    }
    .cadence-bar {
      flex: 1 1 28px; min-width: 28px; display: flex; flex-direction: column;
      align-items: center; gap: 2px;
    }
    .cadence-bar-fill {
      width: 100%; background: ${FOREST}; border-radius: 2px; min-height: 2px;
    }
    .cadence-bar-label {
      font-size: 9px; color: ${INK_SOFT}; white-space: nowrap;
    }
    .cadence-bar-count { font-size: 9px; color: ${INK}; font-weight: 600; }

    /* Variant option chips */
    .mp-opt-row { margin-bottom: 8px; }
    .mp-opt-header { display: flex; gap: 4px; align-items: baseline; margin-bottom: 2px; }
    .mp-opt-name { font-size: 11px; font-weight: 600; color: ${INK}; }
    .mp-opt-count { font-size: 10px; color: ${INK_SOFT}; }
    .mp-opt-chips {
      font-size: 11px; color: ${INK_SOFT}; line-height: 1.6; word-break: break-word;
    }
    .mp-opt-toggle {
      background: none; border: none; color: ${FOREST}; font-size: 10px; font-weight: 600;
      cursor: pointer; padding: 0 2px; text-decoration: underline;
    }

    /* POD app note */
    .mp-pod-app-note { font-size: 10px; color: ${FOREST}; font-weight: 600; }

    /* Product classification drill-down lists */
    .mp-product-reason-show {
      display: inline-block;
      background: none; border: none; cursor: pointer; font-size: 11px; color: ${FOREST};
      text-decoration: underline; padding: 0; margin-top: 4px; font-weight: 600;
    }
    .mp-product-reason-fold { width: 100%; margin-top: 4px; }
    .mp-product-reason-item {
      padding: 6px 8px; border: 1px solid ${BEIGE}; border-radius: 6px; margin-bottom: 4px; background: #FAFAF8;
    }
    .mp-product-reason-link {
      font-size: 12px; font-weight: 600; color: ${FOREST}; text-decoration: none; word-break: break-word;
    }
    .mp-product-reason-link:hover { text-decoration: underline; }
    .mp-product-reason-sub { font-size: 10px; color: ${INK_SOFT}; margin-top: 3px; line-height: 1.35; }

    /* Social presence */
    .mp-social-block { padding: 0 2px 4px 2px; }
    .mp-social-row {
      font-size: 11px; color: ${INK}; padding: 3px 0; display: flex; align-items: center; gap: 8px;
    }
    .mp-social-dot { font-size: 10px; flex-shrink: 0; line-height: 1; }
    .mp-social-dot--yes { color: ${FOREST}; }
    .mp-social-dot--no { color: ${BEIGE}; }
    .mp-section--diff { margin-bottom: 4px; }
    .mp-diff-first-visit {
      display: flex; align-items: flex-start; gap: 6px;
      background: ${CREAM_DARK}; border-radius: 7px; padding: 10px 12px;
      font-size: 11px; color: ${INK_SOFT};
    }
    .mp-diff-fv-icon { font-size: 14px; flex-shrink: 0; line-height: 1.4; }
    .mp-diff-subtitle { font-size: 10px; color: ${INK_SOFT}; margin-bottom: 6px; }
    .mp-diff-nochange { font-size: 11px; color: ${INK_SOFT}; font-style: italic; }
    .mp-diff-row { border-bottom: 1px solid ${BEIGE}; }
    .mp-diff-row:last-child { border-bottom: none; }
    .mp-diff-toggle {
      display: flex; justify-content: space-between; align-items: center;
      width: 100%; background: none; border: none; cursor: pointer;
      padding: 6px 0; text-align: left; gap: 8px;
    }
    .mp-diff-label { font-size: 12px; font-weight: 600; color: ${INK}; }
    .mp-diff-caret { font-size: 10px; color: ${INK_SOFT}; flex-shrink: 0; }
    .mp-diff-items { padding: 0 0 6px 8px; }
    .mp-diff-item { font-size: 11px; color: ${INK_SOFT}; padding: 2px 0; line-height: 1.4; }
    .mp-diff-more { font-style: italic; color: ${INK_SOFT}; }
    .mp-diff-price { font-family: monospace; font-size: 10px; }
    .mp-diff-price--up   { color: ${RED}; }
    .mp-diff-price--down { color: ${FOREST}; }

    /* Discount level badges */
    .mp-promo-label {
      display: inline-block; font-size: 10px; font-weight: 700; border-radius: 99px;
      padding: 1px 6px; text-transform: uppercase; letter-spacing: 0.4px;
    }
    .mp-promo-label--no_discounts { background: ${BEIGE}; color: ${INK_SOFT}; }
    .mp-promo-label--a_few_items_on_sale { background: #E8F5E9; color: #2E7D32; }
    .mp-promo-label--some_items_on_sale { background: #E3F2FD; color: #1565C0; }
    .mp-promo-label--many_items_on_sale { background: #FFF8E1; color: #F57F17; }
    .mp-promo-label--most_items_on_sale { background: #FFEBEE; color: ${RED}; }
    .mp-promo-label--almost_everything_on_sale { background: ${RED}; color: ${CREAM}; }
    .mp-promo-label--no_data { background: ${BEIGE}; color: ${INK_SOFT}; }

    /* Diagnostics clear-snapshots button */
    .mp-diag-clear-snap-btn {
      margin-top: 6px; width: 100%; background: none; color: ${RED};
      border: 1px solid ${RED}; cursor: pointer; font-size: 11px; font-weight: 600;
      padding: 6px 12px; border-radius: 6px; transition: background 0.15s;
    }
    .mp-diag-clear-snap-btn:hover { background: rgba(184,84,80,0.08); }
    .mp-diag-clear-snap-btn:disabled { opacity: 0.55; cursor: default; }
  `;
}

// ─── Auto-init ────────────────────────────────────────────────────────────────

let _bootstrapPromise = null;

/** Reuse detector cache; avoids duplicate /products.json probes. */
async function resolveDetection() {
  if (detectionData) return detectionData;
  if (window.__makerpeekDetected) {
    detectionData = window.__makerpeekDetected;
    return detectionData;
  }
  detectionData = await (window._mpDetectPromise || detectShopify());
  return detectionData;
}

function scheduleAfterPaint(fn) {
  requestAnimationFrame(() => requestAnimationFrame(fn));
}

function whenReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn, { once: true });
  } else {
    fn();
  }
}

async function bootstrapMakerpeek() {
  if (location.protocol !== "https:" && location.protocol !== "http:") return;

  detectionData = await resolveDetection();
  if (!isConfirmedShopify(detectionData)) return;

  if (document.readyState !== "complete") {
    await new Promise((resolve) => {
      if (document.readyState === "complete") resolve();
      else window.addEventListener("load", resolve, { once: true });
    });
  }

  scheduleAfterPaint(() => {});
  await new Promise((r) => scheduleAfterPaint(r));

  const mounted = await mountMakerpeekUI();
  if (!mounted) return;

  window.__makerpeekData = detectionData;
  window.__makerpeekInjected = true;
  chrome.runtime.sendMessage(
    { type: "STORE_VIEWED", domain: detectionData.storeDomain },
    () => void chrome.runtime.lastError,
  );
}

function startBootstrap() {
  if (!_bootstrapPromise) {
    _bootstrapPromise = bootstrapMakerpeek().catch(() => {});
  }
  return _bootstrapPromise;
}

whenReady(async () => {
  const result = await detectShopify();
  if (!result?.isShopify) return;
  detectionData = result;
  void startBootstrap();
});

document.addEventListener("makerpeek:shopify-detected", (ev) => {
  const detail = ev.detail;
  if (!isConfirmedShopify(detail)) return;
  detectionData = detail;
  void mountMakerpeekUI();
});

// ─── Message listeners ────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "GET_STATUS") {
    if (detectionData) {
      sendResponse({
        isShopify: isConfirmedShopify(detectionData),
        confidence: detectionData.confidence || "none",
        domain: detectionData.storeDomain || null,
      });
      return false;
    }
    (window._mpDetectPromise || detectShopify()).then((result) => {
      sendResponse({
        isShopify: isConfirmedShopify(result),
        confidence: result.confidence || "none",
        domain: result.storeDomain || null,
      });
    });
    return true;
  }
  if (msg.type === "GET_DETECTION_TRACE") {
    (async () => {
      window.__makerpeekDetected = null;
      window._mpDetectPromise = null;
      const result = await detectShopify();
      const trace =
        typeof window.__makerpeekFormatDetectionTrace === "function"
          ? window.__makerpeekFormatDetectionTrace(result)
          : JSON.stringify(result, null, 2);
      sendResponse({ ok: true, trace, result });
    })();
    return true;
  }
  if (msg.type === "OPEN_PANEL") {
    (async () => {
      const result = await resolveDetection();
      if (!result?.isShopify) {
        sendResponse({
          ok: false,
          isShopify: false,
          confidence: result?.confidence || "none",
          domain: null,
        });
        return;
      }
      const ready = await ensureMakerpeekReady();
      if (ready) {
        openPanel();
        if (!dataCache && isConfirmedShopify(detectionData)) routePanel();
      }
      sendResponse({
        ok: ready,
        isShopify: isConfirmedShopify(detectionData),
        confidence: detectionData?.confidence || "none",
        domain: detectionData?.storeDomain || null,
      });
    })();
    return true;
  }
});
