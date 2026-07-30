# MakerPeek Chrome Extension

Manifest V3 extension — vanilla JS content scripts and service worker. No bundler; load unpacked from this folder.

---

## Load unpacked into Chrome

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the **`extension/`** folder (the one containing `manifest.json`)
5. Pin the MakerPeek icon (forest green **M**) if you want quick access

After edits, click **Reload** on the MakerPeek card at `chrome://extensions`.

---

## What the panel shows (Shopify stores only)

When you click **M** on a detected Shopify storefront, the panel loads **`/products.json`** (paginated, 250 per page where applicable) and **`/collections.json`** (plus collection product lists for counts). Detection uses `detector.js` (Shopify global, CDN hints, generator meta, optional `/products.json` probe).

Typical sections:

| Area | Notes |
|------|--------|
| **Overview** | Listings, variants, price stats, currency, digital vs POD splits, new-this-month, sale/out-of-stock counts, promotion intensity, vendors, avg variants |
| **Store maturity** | Age from oldest product, cadence (recent vs lifetime calendar on Pro) |
| **Pricing** | Histogram / buckets (Pro), charm vs round pricing patterns, median, std dev, free-shipping hint from DOM |
| **Variants & collections** | Option breakdown (Pro); collections Free = top 3, Pro = full list |
| **App stack** | Signature-matched apps + inferred tier with reasons |
| **Trust signals** | DOM scrape for legal/about/contact links |
| **Changes since last visit** | Diff from local snapshots (`chrome.storage.local`) — never uploaded |
| **Pro extras** | Full product search, CSV export, saved stores, **watchlist** with desktop notifications |

Free tier: **5 distinct stores per UTC day** (see footer in panel). Each metric can expose an **ⓘ** methodology tooltip where implemented.

---

## Popup

Toolbar popup shows today’s usage (free tier), whether the active tab looks like Shopify, domain, **Watchlist** tab (Pro), upgrade/sign-in links to **`https://makerpeek.com`**.

---

## How detection works

`detector.js` checks signals in order until Shopify is confirmed:

1. **`window.Shopify`**
2. **`cdn.shopify.com`** in `<link>` / `<script>`
3. **`<meta name="generator" content="Shopify">`**
4. Async **`/products.json`** probe for `{ products: [...] }`

---

## Known limits

| Limit | Detail |
|-------|--------|
| **Pagination** | `/products.json` is capped at **250 products per request**; the panel paginates client-side when needed. Very large catalogs mean multiple requests while the panel loads. |
| **Currency display** | Uses detected store currency when possible; presentation follows Shopify `variant.price` strings. |
| **HTTPS** | Manifest **`host_permissions`** are **`https://*/*`** — plain HTTP storefronts won’t fetch. |
| **Theme / apps** | Theme name and app detection are best-effort from globals + HTML/script URLs. |
| **Inference** | POD/digital splits use keywords + signals (and POD app detection); edge cases exist. |
| **Pro auth** | Billing/session flows live on **`makerpeek.com`**; extension stores tokens only in **`chrome.storage.local`**. |
| **Watchlist favicons** | Popup rows use Google’s favicon service for icons (`google.com/s2/favicons`) — third-party image request when you open the Watchlist tab. |

---

## File map

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest — permissions (`storage`, `activeTab`, `alarms`, `notifications`), content scripts |
| `background.js` | Service worker — usage quota messages, **`/products.json`** fetch for watchlist polls, watchlist message handlers |
| `content/detector.js` | Shopify detection; exposes `window.__makerpeekData` |
| `content/overlay.js` | M button + shadow DOM panel UI |
| `lib/snapshots.js` | Store snapshots + diff inputs for “changes since last visit” |
| `lib/pro.js` | Pro status + **`DEV_MODE_ENABLED`** override for testing |
| `lib/watchlist.js` | Watchlist storage, caps, diff helpers |
| `lib/proof.js` | Canonical proof-of-method strings (subset mirrored in overlay) |
| `popup/popup.html` · `popup.js` · `popup.css` | Extension popup |

---

## Testing Watchlist (Pro)

Turn **DEV Pro ON** from the panel footer when **`DEV_MODE_ENABLED`** is true in `lib/pro.js`.

See **Testing Watchlist** steps below for alarms and notifications.

### Manual test steps

1. **Add stores**
   - Enable Dev Pro → open panel on a Shopify store → **★ Watch** in the header. Confirm toast + **★ Watching** state.
   - Open popup → **Watchlist** tab → rows appear (max **25** stores).

2. **Fire the alarm**
   - `chrome://extensions` → MakerPeek → **service worker** → DevTools console:
     ```js
     chrome.alarms.create('watchlist_poll', { when: Date.now() + 1000 })
     ```
   - Expect poll logs (`~6h` cadence normal operation; manual alarm fires immediately).

3. **Simulate a price drop** (optional)
   - Inspect `watchlist_v1` in `chrome.storage.local`, tweak a stored price upward in `lastSnapshot`, poll again — notification should summarize qualifying diffs.

4. **Free tier**
   - DEV Pro OFF → alarm should log skip when not Pro.

---

## Pre-launch checklist

1. **`extension/lib/pro.js`** — set **`DEV_MODE_ENABLED = false`** (and **`DEV_FORCE_PAID = false`**).
2. Run **`npm run build:extension`** from the repo root (runs `extension/build.sh`).
3. Load the unpacked **`extension/`** from **`extension/dist/`** zip output or folder — confirm Pro gates lock without dev override.
4. Submit **`extension/dist/*.zip`** to the Chrome Web Store when ready.
