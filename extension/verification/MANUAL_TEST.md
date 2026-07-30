# Manual verification protocol

## Prerequisites

1. Load unpacked extension from `~/Desktop/makerpeek/extension/` at `chrome://extensions`
2. Enable **Developer mode** and allow extension in **Incognito** (Details → Allow in Incognito)
3. Confirm `extension/lib/pro.js` has `DEV_MODE_ENABLED = true` for Pro override testing
4. Open the service worker console: `chrome://extensions` → MakerPeek → **Inspect views: service worker**
5. Open `extension/verification/test-stores.json` — test at least **5 stores** across different groups
6. Create screenshot folder: `extension/verification/screenshots/` (already present)

## Per-store protocol (~15 min each)

1. Open store URL in a **fresh incognito** window
2. Open DevTools → **Console**, filter **All**
3. Confirm `[MakerPeek] Content script loaded` and `[MakerPeek] Detection result` logs
4. Note which `signals` are `true` in the detection object
5. Click the **M** floating button
6. **Screenshot the side panel** → `verification/screenshots/<store-slug>-panel.png`  
   (slug = hostname without `www`, e.g. `allbirds-panel.png`)
7. In a second tab, open `https://<domain>/products.json?limit=250` and spot-check headline numbers
8. For each visible metric:
   - Click **ⓘ**
   - Confirm copy matches `PROOF_DEFINITIONS` in `content/overlay.js:1320-1404`
   - If "Open raw data" appears, confirm it opens the store's `/products.json`
9. Record grouped product count vs raw row count if catalog is large (note `2,500+` capped banner)

### Test Pro gating

**Free mode**

```js
chrome.storage.local.set({ devProOverride: false })
```

Reload the store tab. Verify:

- Popup → **Today**: `X / 5` usage bar
- Panel footer: `Free plan: 5/day`
- **Total variants** row shows PRO skeleton / badge (not real count)
- App stack shows **3 apps** max + upgrade link if more detected
- Cadence toggle: "View full history" shows **PRO** badge; click opens upgrade (does not switch to lifetime)
- **Changes since last visit** section: note whether diff or first-visit message appears (**landing says Pro-only — flag if visible on free**)
- ★ Save / ★ Watch buttons show **PRO**

**Pro mode**

```js
chrome.storage.local.set({ devProOverride: true })
```

Reload. Verify:

- Popup: **Unlimited** (or Pro badge); **Watchlist** tab visible
- Total variants: real number
- App stack: up to 5 then "Show all (N)" if more apps
- Cadence: "View full history" opens lifetime calendar
- ★ Save / ★ Watch work (watchlist max 25)

### Test daily counter

1. Free mode: `chrome.storage.local.remove('dailyViews')` then visit **5 different** Shopify stores (new incognito or clear storage between days is not required for same-day test)
2. After each visit, in service worker console:

```js
chrome.storage.local.get('dailyViews', console.log)
```

3. Expect `{ date: "<UTC YYYY-MM-DD>", count: 1..5 }` — reset uses **UTC midnight**, not local (`background.js:214-216`)
4. Visit a **6th** store: confirm whether panel still loads and whether any upsell appears (**code audit: enforcement may be missing — document actual behavior**)

### Test change monitoring

1. Pro mode on a store with a manageable catalog
2. **First visit:** panel should show first-visit message in "Changes since last visit"
3. Reload same tab after ~1 minute: expect "No changes detected" or accurate diff
4. **Manual mutation test** (service worker or page console won't work — use Extensions storage):
   - Open `chrome://extensions` → MakerPeek → service worker → Application → Storage → `chrome.storage.local`
   - Find key `mp_snap_v1:<domain>` and edit prior snapshot JSON (remove a product id or change a price)
   - Reload store → confirm diff lists the change
5. Confirm at most **5** snapshots kept per domain after many reloads (`lib/snapshots.js:7-8`)

### Test watchlist (Pro)

1. Pro mode → **★ Watch** on a store → toast + "★ Watching"
2. Popup → **Watchlist** tab → row appears
3. Optional alarm test (service worker console):

```js
chrome.alarms.create('watchlist_poll', { when: Date.now() + 1000 })
```

## Per-store output

Fill one block in `VERIFICATION_LOG.md` per store. Mark each checkbox **pass / fail**. Document mismatches under **Bugs / mismatches found**.

## Acceptance criteria (manual phase)

- [ ] **5 stores** fully tested (mix of groups from `test-stores.json`)
- [ ] Overview + Activity + Maturity + Profile claims pass on **≥4 of 5** stores (allow 1 edge-case failure with note)
- [ ] App stack detects **≥1** plausible app per store (or documents false negative)
- [ ] Pro gating behaves consistently on all 5 stores
- [ ] Change monitoring diff accurate when snapshot is manually mutated
- [ ] Any **landing page lie** or **gating mismatch** copied into `REPORT.md` section 4

## After manual testing

Update `REPORT.md` with pass rates, bugs, and ship decision. Do not change extension code during this pass.
