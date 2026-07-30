# Verification log

Copy the block below for each store tested. Save screenshots to `verification/screenshots/<store-slug>-panel.png`.

---

## Store: <url>
## Date: <ISO date>
## Detector signals fired: <comma-separated keys from `detectionData.signals` where true, plus `productsEndpoint.works`>
## /products.json accessible: yes/no
## Total products (grouped headline): <n>
## Total Shopify rows fetched: <n>
## Capped at 2500: yes/no

### Overview claims
- [ ] Product count matches grouped count from `/products.json` (style-key rollup — NOT raw row count)
- [ ] Price span (min/max) matches min/max of per-group cheapest first-variant prices
- [ ] Average price: mean of per-group cheapest prices (NOT mean of all variant prices)
- [ ] Median price: median of per-group cheapest prices
- [ ] Spread: standard deviation of per-group cheapest prices (labeled "Price spread" in panel)

### Activity claims
- [ ] New listings (30 days): grouped products with any row `published_at` within 30 days
- [ ] Sale count: grouped products with any variant `compare_at_price > price`
- [ ] Sold out count: grouped products where every variant has `available === false` (not `inventory_quantity`)
- [ ] Discount level: % of grouped products on sale + categorical label (NOT simple avg % off catalog)

### Store maturity claims
- [ ] Publishing since: oldest `published_at` among fetched rows + humanized age via `formatStoreAge`
- [ ] Monthly launch pace: grouped product count ÷ months since oldest `published_at`
- [ ] 6-month cadence chart (free): last 6 calendar months bar heights match monthly new-group counts
- [ ] Lifetime cadence (pro): full month grid matches monthly new-group counts

### Store profile claims
- [ ] Theme detected: `Shopify.theme.name` → `ShopifyAnalytics` → inline JSON → fallback
- [ ] Vendors list: unique `vendor` strings across fetched rows
- [ ] Avg variants per product: total variants ÷ grouped product count

### App stack claims
- [ ] Apps detected match script/HTML signature patterns in page source (`detector.js` + `inferApps`)
- [ ] At least one inferred signal fires when no signature matches (POD inference test on POD stores)
- [ ] Top 3 apps shown on free tier (`FREE_APP_CAP = 3`)
- [ ] All apps shown when Pro override enabled (expand control if >5 apps)

### Verifiability claims
- [ ] ⓘ tooltip opens on click for every visible metric
- [ ] "Open raw data" link opens `/products.json?limit=250` when `verifyPath` is set
- [ ] `PROOF_DEFINITIONS` in `content/overlay.js` has an entry for every visible metric

### Change monitoring (Pro — landing claim)
- [ ] Snapshot created on first visit (`snapshots.js` `persistSnapshot`)
- [ ] Snapshot retrieved on second visit (`getPreviousSnapshot`)
- [ ] Diff correctly identifies: new products, removed products, price changes
- [ ] Max 5 snapshots per store enforced (`MP_SNAP_MAX` in `lib/snapshots.js`)
- [ ] **Pro gating:** change monitoring hidden or upsold on free tier (see CODE_MAP — currently may show to all users)

### Watchlist (Pro — landing claim)
- [ ] Watch button gated on free; works when `devProOverride: true`
- [ ] Watchlist tab in popup (Pro only)
- [ ] Background poll + desktop notification on qualifying diff

### Pro gating
- [ ] Free: 5 store views/day counter increments (`background.js` `STORE_VIEWED`)
- [ ] Free: counter resets at **UTC** midnight (`todayUTC()` — not local midnight)
- [ ] Free: 6th store shows limit upsell / blocks panel (verify — may not be enforced in code)
- [ ] Pro override: `chrome.storage.local.set({ devProOverride: true })` bypasses counter increment
- [ ] Pro override: unlocks total variant count, full app stack, full cadence toggle
- [ ] Pro override: watchlist + save store

### Bugs / mismatches found
<free text>

---

<!-- Duplicate the block above for each store -->
