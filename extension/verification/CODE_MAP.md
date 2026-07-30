# Code map: landing page claim → implementation

Static audit only (Phase 1). Line numbers refer to `extension/` as of this pass.  
**Methodology caveats** are called out where the landing page or verification checklist oversimplifies behavior.

---

## Detector & catalog fetch

| Claim | Implementation |
|-------|----------------|
| Shopify detection (M button only on Shopify) | `content/detector.js:329-382` (`detectShopify`) — 6 synchronous signals + optional `/products.json?limit=1` probe |
| Signals available for logging | `content/detector.js:336-343` — `shopifyGlobal`, `cdnShopify`, `metaGenerator`, `shopifyAnalytics`, `monorailEndpoint`, `routesGlobal` |
| UI injected only when Shopify | `content/overlay.js:3396-3410` (auto-init returns early if `!isShopify`) |
| Paginated `/products.json` fetch | `content/overlay.js:279-322` (`fetchAllProducts`), cap 2500 rows (`PRODUCTS_FETCH_CAP` L23) |
| Per-page fetch | `content/overlay.js:231-276` (`fetchProductsPageWithTimeout`) |

---

## Overview

| Claim | Implementation |
|-------|----------------|
| Product count (grouped) | `content/overlay.js:587-608` (`groupByStyle`), `547-585` (`computeStyleKey`); headline `distinctStyles` at `computeStats` L961, rendered L2062-2063 |
| Total variants (Pro gated) | Summed in `computeStats` L990-994; rendered paid L2065-2068, free skeleton L2070-2074 |
| Price span min/max | Per-group cheapest via `cheapestListingPriceInGroup` L613-619; min/max L1164-1167, rendered L2049-2051 |
| Average price | Mean of `groupReprPrices` L1168-1170 — **not** mean of all variant prices |
| Median price | `median()` L846-852 applied to `groupReprPrices` L1172 |
| Price spread | `stdDev()` L855-859 on `groupReprPrices` L1173; UI label "Price spread" L2057-2059 |

---

## Activity

| Claim | Implementation |
|-------|----------------|
| New products (30 days) | Any row in group with `published_at` within 30d → `styleHasNew` L1009-1010, `newCount++` L1031; uses **`published_at` not `created_at`** |
| Products on sale | Variant `compare_at_price > price` L1014-1016 → `saleCount` L1032-1033 |
| Fully sold-out products | `groupIsFullyOos` L622-630 — all variants `available === false`; **no `inventory_quantity`** |
| Avg % off (subtext when on sale) | `representativeProductSaleDiscountPct` L921+, averaged L1130-1134, shown L2122-2124 |
| Discount level | `computePromotionIntensity` L1708-1739 — % products on sale + label; rendered L2103-2110 |

---

## Store maturity

| Claim | Implementation |
|-------|----------------|
| Publishing since | Oldest `published_at` L991-996, L1155-1156; display + `formatStoreAge` via `lib/format.js:4-22`, rendered L2139-2153 |
| Avg products / month | `computeLifetimeAvg` L1311-1315; rendered L2155 |
| 6-month cadence (free) | `buildCadenceBarsFromMonthlyCounts(..., "recent")` L663-669; monthly buckets from `buildStyleMonthlyLaunchBuckets` L634-648 |
| Lifetime cadence (Pro) | Same builder `mode === "lifetime"` L672-680; toggle gated `handleCadenceToggle` L1628-1641, `renderCadenceBlock` L1604-1625 |
| Cadence counts | New **grouped** products per month (earliest `published_at` or `created_at` in group) L634-648 |

---

## Store profile

| Claim | Implementation |
|-------|----------------|
| Theme | `content/detector.js:425-499` (`detectTheme`); rendered `buildThemeProfilePresentation` L1644+, L2163-2171 |
| Distinct vendors | `Set` of `p.vendor` L972-993, `vendorCount` L1193, rendered L2165 |
| Avg variants per product | `totalVariants / distinctStyles` L1194, rendered L2166 |

---

## App stack

| Claim | Implementation |
|-------|----------------|
| Signature detection | `content/detector.js:9+` (`APP_SIGNATURES`), `detectAppsFromSignatures` L223+, `detectApps` L289+ |
| Inferred apps (POD, Shop Pay, email, currency) | `content/overlay.js:1817-1888` (`inferApps`) |
| Merge + sort by confidence | `mergeDetectedAndHintedApps` L1901-1942 |
| Free: top 3 | `FREE_APP_CAP = 3` L2203, slice L2211-2216 |
| Pro: top 5 collapsed, expand to all | `PRO_APP_COLLAPSED = 5` L2204, L2218-2228; expand handlers L2550-2556 |
| Render rows | `renderAppStackRowHtml` L1954+, section L2237-2245 |

---

## Verifiability (ⓘ tooltips)

| Claim | Implementation |
|-------|----------------|
| Tooltip definitions (panel) | `content/overlay.js:1320-1404` (`PROOF_DEFINITIONS`) |
| Canonical copy (lib) | `lib/proof.js:4-94` — should stay aligned with overlay |
| `proofIcon()` markup | `content/overlay.js:1406-1411` |
| Click → shared tooltip | `content/overlay.js:2435-2454` |
| Verify link | `data-tip-verify` → `/products.json?limit=250` when `verifyPath` set L1410 |

**Visible metrics with proof icons:** products, totalVariants (Pro), listingPriceSpan, avgListingPrice, medianPrice, priceSpread, newProducts, productsOnSale, fullySoldOut, discountLevel, publishingSince, avgProductsPerMonth, theme, distinctVendors, avgVariantsPerProduct, appStack, changesSinceLastVisit.

---

## Change monitoring & watchlist

| Claim | Implementation | Gating |
|-------|----------------|--------|
| Build snapshot | `lib/snapshots.js:11-31` (`buildSnapshot`) | Runs for all users in `fetchAndRender` L792-795 |
| Previous snapshot | `lib/snapshots.js:36-40` (`getPreviousSnapshot`) | All users |
| Diff computation | `lib/snapshots.js:70-118` (`computeDiff`) | All users |
| Max 5 snapshots/store | `lib/snapshots.js:7-8`, trim L47-48 | All users |
| Panel section "Changes since last visit" | `renderDiffSection` L1744-1782; wired L2257-2273 | **NOT Pro-gated in render** |
| Watchlist add/remove | `lib/watchlist.js:44-70`, messages in `background.js:291+` | Pro only (`getProStatus` L45-46) |
| Watchlist poll + notifications | `background.js` (alarm handler — poll stores) | Pro only |
| Watchlist diff helper | `lib/watchlist.js:107-140` (`computeWatchlistDiff`) | Background poll |

---

## Pro gating & usage

| Claim | Implementation |
|-------|----------------|
| `devProOverride` / Pro status | `lib/pro.js:26-37` (`getProStatus`); dev toggle UI `overlay.js:2562-2571` |
| 5 views/day counter | `background.js:19`, `214-237`, increment on `STORE_VIEWED` L264-274 |
| UTC day reset | `background.js:214-216` (`todayUTC`) — **not local midnight** |
| Popup usage display | `popup/popup.js:88-99` |
| Footer "Free plan: 5/day" | `overlay.js:2323-2325` |
| Save store button | Gated L2291-2293, handler L2367-2373 |
| Watch store button | Gated L2298-2300, handler L2377-2411 |
| Saved stores in popup | `popup/popup.js:104-109`, `175+` (`renderSavedStores`) — Pro only |

---

## Missing implementations (landing claim vs code)

These are **not rendered** in the panel today, though some logic exists in `computeStats` or skeleton helpers:

| Landing / checklist claim | Status |
|---------------------------|--------|
| Change monitoring **Pro-only** in panel | **GATING MISMATCH** — diff section renders for free users (`overlay.js:2257-2273`). **Launch blocker** if marketing stays Pro-only. |
| Block / upsell on 6th store view | **NOT FOUND** — counter increments (`background.js:231-237`) but nothing blocks `fetchAndRender` or panel open when `count >= 5`. |
| Price distribution histogram (Pro) | **NOT RENDERED** — `priceBuckets` computed L1204, `renderProGated`/`renderSkeleton` L1515+ never called from `renderPanel`. |
| Pricing patterns: charm/round % (Pro) | **NOT RENDERED** — computed L1199-1203, skeleton only L1481-1488. |
| Variant options breakdown (Pro) | **NOT RENDERED** — `computeVariantOptions` L1205, skeleton L1474-1479. |
| Searchable full product list + CSV export (Pro) | **NOT RENDERED** — `renderProductList` referenced in post-render L2574-2596 but no HTML mounts `#mp-product-search` in `renderPanel`. |
| Digital / POD product counts in panel | **NOT RENDERED** — computed L979-1128, L1183-1186; classification UI handlers exist L2495-2516 but no section in `bodyHTML`. |
| Collections (top 3 / all) | **NOT FOUND** in extension — README mentions `/collections.json` but no fetch in codebase. |
| Trust signals | **NOT FOUND** |
| "Priority email support" (Next.js page only) | N/A extension |

---

## Landing page vs verification checklist corrections

When filling `VERIFICATION_LOG.md`, use **implementation truth** above, not naive formulas:

1. **Product count** = style-grouped count, not `products.json` array length.
2. **Prices** = per-group cheapest first-variant price, not all variants.
3. **New products** = `published_at`, not `created_at`.
4. **Sold out** = `available` boolean, not `inventory_quantity`.
5. **Discount level** = promotion intensity (% on sale + label), not catalog-wide average discount.
6. **Detector** = 6 named boolean signals + products endpoint probe (not a single check).
7. **Daily reset** = UTC date string (`toISOString().slice(0,10)`), not local midnight.

---

## File index (audit scope)

| File | Role |
|------|------|
| `content/overlay.js` | Panel UI, stats, rendering, proofs |
| `content/detector.js` | Shopify detection, theme, app signatures |
| `lib/snapshots.js` | Local snapshots + visit diff |
| `lib/watchlist.js` | Pro watchlist storage + poll diff |
| `lib/pro.js` | Pro / dev override |
| `lib/proof.js` | Proof definition mirror |
| `lib/format.js` | Store age formatting |
| `background.js` | Usage counter, watchlist poll, product fetch for alarms |
| `popup/popup.js` | Usage UI, watchlist tab, saved stores |
