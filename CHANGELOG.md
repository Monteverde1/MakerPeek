# Changelog

All notable changes to MakerPeek are documented here.

---

## [1.4.0]

### Extension (`extension/`)

- Switched **New products** and **Publishing since** sources from `created_at` to `published_at` to reflect actual store activity instead of database entry age.
- **Publishing since** now displays full date plus relative age (e.g. `Nov 12, 2018 · 7 years 6 months`).
- Repaired **App stack** rendering after v1.3.0 cleanup (restored `inferApps` heuristics removed by mistake).
- Added per-metric **`[MakerPeek] AUDIT`** log at end of `computeStats` for ongoing diagnostic visibility.
- Added sanity assertions on every count (log `console.error` and continue on failure).
- App stack render path logs **STAGE 1–3** breadcrumbs for diagnosis.

---

## [1.3.1]

### Extension (`extension/`)

- Restored `formatStoreAge` in `extension/lib/format.js` (accidentally dropped during v1.3.0 cleanup). Content scripts load it before `overlay.js`.
- Audited other `format*` helpers — only `formatStoreAge` is referenced; prices use inline `toLocaleString` / template literals.

---

## [1.3.0]

### Extension (`extension/`)

- **Cut to ship** — Removed Currency row, Free shipping row, Social presence section, Export to CSV, Glossary, and Diagnostics from the panel. Watchlist remains the headline Pro feature (★ Watch in header, popup tab, background alarms/notifications unchanged).
- **Slimmer panel** — Body is now Changes since last visit, Overview (products, variants, price span/avg/median/spread), Activity, Store maturity, Store profile, and App stack. Footer is **Fetched · Products · Variants** only.
- **Faster load** — Skipped `/collections.json` fetch on each store open.

---

## [1.1.0]

### Extension (`extension/`)

- **Terminology** — Panel copy now sticks to **Products** (grouped catalog entries) vs **Variants** (SKUs). User-facing wording dropped “styles” and “listings”; footer summarizes **Fetched · Products · Variants** only.
- **ALL PRODUCTS** — The catalog list renders one row per grouped product with base titles, **`+N colors`** badges when needed, **`from $…`** when prices diverge within a group, SKU-level stock dots, and links to each group’s canonical product URL.
- **Tooltips** — Every panel ⓘ uses one-sentence plain-English definitions plus optional raw-json links aligned to the refreshed proof keys (`charmPricing`, `medianPrice`, `variantOptions`, etc.).
- **Grouping** — Extended poetic color dictionaries/modifiers tighten title-based grouping logs (`[MakerPeek] Style key` samples stay throttled).
- **Theme detection** — Reordered sources (`Shopify.theme.name` → `ShopifyAnalytics` → inline JSON), rejects backup/date/draft fingerprints, emits structured `[MakerPeek] Theme detection`, and clamps long names with expandable rows.
- **Diagnostics** — Added `[MakerPeek] Recent products (last 30d)` logging and grouped **`created_at`** handling so the headline “new products” metric matches “any SKU in group is new.”

---

## [1.0.0]

### Extension (`extension/`)

- **Distinct styles headline** — Product count now groups color-variation (and similar) listings into shopper-facing **styles** using a heuristic on `/products.json` titles (separator split, strip color tokens, bracket/parenthetical cleanup). Raw **listing** count and total variant sum stay visible in the footer for transparency.
- **Single source** — Metrics use the dedup `/products.json` catalog + style grouping only. Removed prior visibility filtering (navigation DOM scraping, `/sitemap_products_*` intersection, capped collection unions, catalog-vs-visible branching, staged debug logs).

---

## [0.9.0] — 2026-05-16

### Extension (`extension/`)
- **Nav-DOM-visible catalog** — Headline counts and product-level metrics derive from **`/collections/{handle}/products.json`** for handles scraped from **`nav`**, **`header`**, **`footer`**, and **`[role="navigation"]`** anchors linking **`/collections/`** (cap **30** handles, alphabetical, **≤4** paginated requests × **250** products per handle, **5 s** per handle via parallel **`Promise.allSettled`**). Dedup **`product.id`** and hydrate rows from **`/products.json`**.
- **Fallbacks** — **`&lt;2`** handles or **zero** successful collection responses → **`/sitemap_products_1.xml`** ∩ **`/products.json`**; still empty → full catalog plus inline warning (**`⚠`** + subtitle).
- **Logging** — **`[MakerPeek] Nav handles extracted`** and **`[MakerPeek] DOM visible set`**.
- **ⓘ headline** — Methodology tooltip matches storefront navigation wording (merchant menu = source of truth for “visible” rows).
- **Changelog gist** — Sitemap (**`v0.8`**) demoted to **fallback only** alongside raw catalog after nav + sitemap both fail.

---

## [0.8.0] — 2026-05-16

### Extension (`extension/`)
- **Sitemap-visible catalog** — Visible product counts (and variants, pricing, POD/digital, maturity, activity, etc.) now derive from Shopify’s own **`sitemap_products_*.xml`** listing (via **`/sitemap.xml`** index, or **`/sitemap_products_1.xml`** if the index is unavailable): handles from product URLs intersect **`/products.json`**. Removing the unreliable collection-union pipeline; `/collections.json` remains for the **Collections** panel only (`products_count` metadata).

---

## [0.7.5] — 2026-05-16

### Extension (`extension/`)
- **Shopper-visible catalog** — Headline product counts and downstream stats (pricing, activity, POD/digital, maturity cadence, variant totals, histograms, etc.) now derive from IDs **deduped across customer-facing** `/collections/{handle}/products.json` (max **40** handles sorted by Shopify `products_count`, **parallel** requests, **5s** timeout per handle, pagination matching `/products.json`). Rows hydrate from `/products.json` where ids intersect.
- **Raw catalog preserved** — Footer shows **Visible: N · Catalog (incl. archived): M · Fetched [time]**; expandable breakdown surfaces ghost SKUs versus paginated totals. CSV export still dumps the wide `/products.json` pull for power diagnostics.
- **Fallback UX** — If zero storefront collections survive filtering—or the union collapses—all metrics fall back to `/products.json` with an inline caution string (plus console warnings).
- **Merchandising filter** — Tightened to explicit internal handle prefixes only (dropped `published_at` hides, generic `core-`/`bogo` handle rules, and loose title `bogo` matches) so real nav collections aren’t zeroed out. Console **STAGE 1–5** breadcrumbs plus **⚠** tooltip when the headline is catalog-fallback.

---

## [0.7.4] — 2026-05-16

### Extension (`extension/`)
- **Theme detection** — Priority chain: `Shopify.theme.name` → `ShopifyAnalytics.meta.themeName` → `meta[name="theme-name"]` → inline `{ "theme": { "name": ... } }` → `Shopify.theme.role + " theme"`. Ignores Shopify backup-style identifiers (`rc-cm-`, `cm-`, `backup`, ISO-date prefixes). Removed theme-store ID and `/themes/{id}` string fallbacks. Console: `[MakerPeek] Theme detection`.
- **Theme row UI** — Long names wrap (2-line clamp) with tooltip (ⓘ) for full label; strings over 50 characters click-expand to reveal the full theme line.
- **“Avg % off”** — Now one representative discount **per product** (listing-variant sale first, otherwise cheapest discounted variant’s compare-at %) averaged across discounted products; variant-weighted baseline logged beside it for regressions (`[MakerPeek] Sale discount avg`).
- **Count auditing** — Logs include visible vs ghost SKUs (`[MakerPeek] count audit`); sanity clamps fire if segmented totals overshoot the **shopper-visible** union.

---

## [0.7.3] — 2026-05-15

### Extension (`extension/`)
- Activity section simplified. Promotion intensity thresholds rebalanced (pure products-on-sale %; adds **Some items on sale** band). App stack capped to **3** (Free) / **5** (Pro) with show-all expansion and clearer methodology note. Price metrics computed **per product** using listing price (first variant) instead of across all variants; panel labels/tooltips updated (**Price spread**, listing-price wording).

---

## [0.7.2] — 2026-05-15

### Extension (`extension/`)
- **Products pagination** — Fixed `/products.json` pagination hang on stores where pagination logic failed to terminate cleanly on the final page: added **7s per-page** AbortController timeouts, explicit exits on **empty page**, **partial page (< 250 items)**, **10-page cap**, and **2 500 unique products**. Partial loads surface **`productsFetchError`** with an inline **Click to retry** banner instead of an infinite loading state.
- **Watchlist polling** — `background.js` product pagination mirrors the same timeout, empty/short-page exits, and 2 500 cap.

---

## [0.7.1] — 2026-05-15

### Extension (`extension/`)
- **Collections** — Fixed infinite-loading regression: trusts Shopify **`products_count`** from `/collections.json` directly instead of fetching `/collections/{handle}/products.json` for every collection for overlap dedup. Added **10s** fetch timeout and render-level **error boundary** (“Couldn't load collections. Click to retry.”).
- **Other panels** — Same retry-style boundaries for **app stack**, **social presence**, and **snapshots/diff**; merchandising lazy-fetch wrapped in try/catch with toast on failure.

---

## [0.7.0] — 2026-05-15

### Extension (`extension/`)
- **Discount level labels** — Replaced jargon promotion tiers with plain English (No discounts → Almost everything on sale), updated glossary/help copy, refreshed badge styles.
- **Social only** — Removed Trust / required-pages checks; Social presence is now a dedicated section directly above App stack.
- **Product-first counts** — Inventory and activity stats default to whole products by id; clarified variant-only rows; sold-out headline counts fully-OOS products with a sub-note for unavailable variants inside partly-available products.
- **Digital/POD disclosure** — When counts are non-zero, “Show products” expands linked titles plus muted rationale per product (25 + show-all).
- **App stack overhaul** — One combined list ranked by certainty with Confirmed / Likely / Possible pills, broader regex + DOM-marker coverage, dozens of extra signature patterns for common Shopify tooling.
- **Theme row** — Store profile surfaces theme name (+ role when known) plus a methodology tooltip documenting sources.
- **Noise reduction** — Dropped Unknown scripts rendering; kept detection math server-side usable only for scoring.
- **Library sync** — `extension/lib/proof.js` aligns with overlay methodology notes.

---

## [0.6.0] — 2026-05-15

### Removed
- Removed Pro Briefing. The feature shipped with an unresolved loading bug and an unscalable cost model. Watchlist is now the headline Pro capability. Briefing endpoint, extension client, Supabase tables, and UI all removed.

---

## [0.5.0] — 2026-05-15

### Added
- **Pro Watchlist** — track up to 25 Shopify stores in the background and receive desktop notifications when meaningful changes occur.
  - New `extension/lib/watchlist.js` module: `watchlist_v1` storage key, 25-store cap, Pro gate, per-store `alertPreferences`.
  - Background polling via `chrome.alarms` (`watchlist_poll`, every 6 h). Rotates through stores using a `nextPollIndex` cursor so large watchlists spread across alarm windows; 30 s throttle between individual store fetches.
  - Per-store diff computation reuses the slim snapshot format from `snapshots.js`. Categories: new products, removed, restocks, price drops (threshold-filtered), new sales.
  - `chrome.notifications` fires when qualifying changes are detected; clicking the notification opens the store domain in a new tab.
  - Diff cached under `watchlist_diff_v1:{domain}` for popup display without re-fetching.
  - **"★ Watch" button** in the panel header, next to the existing "★ Save" button. Three states: gated (not Pro), watchable (Pro, not watching), watching (Pro, active — subdued style; click to remove with confirm). Shows a fade-in toast on add/remove.
  - **Watchlist tab** in the extension popup (visible to Pro users only via a "Today | Watchlist" tab strip). Displays stores sorted by most recent qualifying change, with favicon, domain, last-change summary, and relative timestamp. Empty state prompt included. Hover reveals a "Remove" link per row; clicking a row opens the domain.
  - **Alert settings panel** in the Watchlist tab: toggles for new products, restocks, price drops, new sales, removed products; numeric threshold for minimum price-drop percentage. Settings applied globally across all watched stores.
  - New `manifest.json` permissions: `"alarms"`, `"notifications"`.

---

## [0.4.0] — 2026-05-15

### Added (removed in [0.6.0])
- **Experimental Pro AI panel** — Claude-synthesized analyst read on positioning, pricing strategy, product mix, and target customer from `/products.json` data, app stack, and computed stats (`POST` inference route, Supabase cache + counters, Claude Sonnet 4.5). Shipped top-of-panel skeleton and live synthesis for subscribers; gated placeholder for Free.

---

## [0.3.0] — 2026-05-14

### Added
- Separate **Digital products** and **POD products** metrics (previously combined as "Digital/POD"). Digital takes precedence; a product cannot be counted in both categories.
- **Calendar heatmap** for the Store Maturity lifetime view — year × month grid replaces the horizontal-scroll sparkline.
- **Inferred apps** tier in App Stack — heuristic detections (POD service, Shop Pay, email capture, multi-currency) shown separately from signature-matched detections with reason text.
- **Trust signals** split into Required (privacy, terms, shipping, returns, contact) and Optional (about, FAQ, blog) groups. Missing required items are flagged inline.
- Collections section collapsed to 3 rows by default with "Show all N ▾" toggle.
- Pro product list collapsed by default with "Show all N products ▾" expand toggle.
- Dev Pro toggle in panel footer when `DEV_MODE_ENABLED = true` in `extension/lib/pro.js`.

### Changed
- All Pro-gated sections now render shimmer skeleton placeholders instead of blurred real data. Real values are never present in the DOM for free users.
- `extension/lib/pro.js` rewritten with `DEV_MODE_ENABLED` flag, `setDevProOverride()`, and `isDevMode()` exports.
- `build.sh` now checks both `DEV_MODE_ENABLED` and `DEV_FORCE_PAID` before building.

---

## [0.2.0] — 2026-05-13

### Added
- Snapshot persistence and "Changes since last visit" diff section.
- Trust signals section (DOM link scrape for legal pages and social media).
- Promotion intensity score combining sale breadth and depth.
- Glossary panel ("?" button in header).
- Viewport-aware tooltip positioning (fixed, never clipped).
- Expanded app signature library (~85 apps across 15+ categories).
- Unknown scripts section in App Stack.
- Currency detection cascade (Shopify globals → JSON-LD → meta tags → TLD heuristic).
- M button suppressed on non-Shopify stores.
- Flexbox cadence sparkline with Recent/Lifetime toggle.
- Collapsible variant option chip lists.

---

## [0.1.0] — 2026-05-12

### Added
- Initial MakerPeek extension v1: Shadow DOM panel, Shopify store detection, product data fetching, overview stats, store maturity, price distribution, variant options, pricing patterns, collections, Pro gating, CSV export.
- Marketing landing page, privacy policy.
- Waitlist API route backed by Supabase.
- `build.sh` with dev-flag guard and zip packaging.
