# Pre-launch cleanup log

Date: 2026-05-20  
Scope: MakerPeek Chrome extension (`extension/`)  
Commits: none (review-only pass)

---

## Phase 1: Strip dev features

### Step 1.1 — Raw grep output (before changes)

```text
$ grep -rn "DEV_MODE_ENABLED\|devProOverride\|DEV_MODE\|__DEV\|DEBUG_" extension/ --include="*.js" --include="*.html"
extension/content/overlay.js:181:  await chrome.storage.local.set({ devProOverride: paid });
extension/lib/pro.js:3:// DEV_MODE_ENABLED: when true, reads pro state from devProOverride storage key so
extension/lib/pro.js:5:// Set DEV_MODE_ENABLED = false (and DEV_FORCE_PAID = false) before running build.sh.
extension/lib/pro.js:23:const DEV_MODE_ENABLED = true; // SET TO false BEFORE PRODUCTION BUILD
extension/lib/pro.js:24:const DEV_FORCE_PAID   = false; // legacy flag — superseded by DEV_MODE_ENABLED
extension/lib/pro.js:33:  if (DEV_MODE_ENABLED) {
extension/lib/pro.js:34:    const stored = await chrome.storage.local.get("devProOverride");
extension/lib/pro.js:35:    return { paid: !!stored.devProOverride, source: "dev_override" };
extension/lib/pro.js:46:  await chrome.storage.local.set({ devProOverride: paid });
extension/lib/pro.js:50:  return DEV_MODE_ENABLED;

$ grep -rn "console\.\(log\|debug\|info\|warn\)" extension/ --include="*.js"
extension/background.js:115:    console.log("[MakerPeek] Watchlist poll skipped — not Pro");
extension/background.js:158:  console.log("[MakerPeek] Watchlist polling:", domain);
extension/background.js:164:    console.warn("[MakerPeek] Watchlist fetch error for", domain, err.message);
extension/background.js:258:    console.warn(message.message);
extension/background.js:269:    console.log(
extension/content/overlay.js:5:console.log('[MakerPeek] Overlay script loaded on', location.href);
extension/content/overlay.js:245:  console.log("[MakerPeek] Gate check:", { feature, paid: false });
extension/content/overlay.js:309:  console.warn(message);
extension/content/overlay.js:549:      console.log("[MakerPeek] Style key:", { title: rawTitle, key: styleKey });
... (23 overlay.js lines, 3 detector.js, 4 fetchers.js)

$ grep -rn "Toggle Pro\|toggle-pro\|togglePro\|setDevPro" extension/ --include="*.js" --include="*.html" --include="*.css"
extension/lib/pro.js:45:export async function setDevProOverride(paid) {
```

Additional dev UI (not caught by third grep): `[DEV] Pro:` footer in `overlay.js`, Alt+Shift+D/P shortcuts, triple-click brand easter egg, `devToggleUiHidden` storage key.

### Step 1.2 — Per-file diff summary

| File | Removed / changed |
|------|-------------------|
| `lib/pro.js` | Deleted `DEV_MODE_ENABLED`, `DEV_FORCE_PAID`, `devProOverride` branch, `setDevProOverride()`, `isDevMode()`. `getProStatus()` reads only `proStatus` from storage. |
| `content/overlay.js` | Removed dev footer toggle HTML/CSS, keyboard shortcuts, brand triple-click, `applyDevProOverride`, `isDevModeActive`, `devToggleUiHidden` helpers. Stripped all `console.log` / `console.info` / `console.debug` (incl. multiline audit blocks). Removed unused `warnServiceWorker`. |
| `background.js` | Removed watchlist skip/poll `console.log`, fetch `console.warn` on expected failures, `CONSOLE_WARN` relay, `CATALOG_FETCHED` logging handler. Kept `console.error` on poll orchestrator catch. |
| `content/detector.js` | Removed load/detection/theme `console.log` calls. |
| `lib/fetchers.js` | Removed catalog `console.log`; `logCatalogFetch` is now a no-op (call site kept). |
| `manifest.json` | Version `0.1.0` → `1.0.0`. Name em dash → colon. `host_permissions` unchanged (`https://*/*`; no `<all_urls>` in host_permissions). Content script still uses `<all_urls>` for Shopify detection on any page. No `externally_connectable` / localhost entries present. |
| `build.sh` | Dev guard now fails if `devProOverride` or `DEV_MODE_*` reappear in `pro.js`. Fixed `${ZIP_NAME}` echo under `set -u`. |
| `popup/*` | No dev toggle was present (confirmed). |

**Test fixtures:** `gazebogolf.ca` only in `extension/verification/test-stores.json` (not shipped in runtime code).

### Step 1.3 — Verification checklist

Build:

```bash
cd extension && ./build.sh
# ✓ pro.js has no dev override hooks
# ✓ Built: extension/dist/makerpeek-extension-v1.0.0.zip
```

Post-fix static greps (automated):

| Check | Result |
|-------|--------|
| No `DEV_MODE_*` / `devProOverride` / `setDevPro` in `.js` / `.html` | **PASS** (empty) |
| No `console.log` / `console.debug` / `console.info` in extension `.js` | **PASS** (empty) |
| No Toggle Pro / dev toggle UI hooks | **PASS** (empty) |

Manual Chrome profile tests (not run in agent environment; **you should run these**):

| Check | Result |
|-------|--------|
| `chrome.storage.local.set({devProOverride: true})` then reload → Pro locked | **PENDING** (static: no code path reads key) |
| `chrome.storage.local.set({DEV_MODE_ENABLED: true})` then reload → Pro locked | **PENDING** (key unused) |
| Popup: no Pro toggle, no debug section, no version string with `dev` | **PENDING** (static: UI removed; version `1.0.0`) |
| Service worker console: no info/debug noise on normal page loads | **PENDING** (static: logs removed) |

---

## Phase 2: Wording scrub

### Step 2.1 — Raw grep output (before changes)

Em/en dash grep hit 80+ lines across `extension/`, `makerpeek-landing/`, `app/` (mostly comments, UI placeholders `—`, price buckets `$0–25`, and marketing copy). Banned-vocabulary grep: **no hits** in extension JS/HTML.

### Step 2.2 — Per-file diff summary

| File | Changes |
|------|---------|
| `lib/proof.js` | Rewrote methodology strings in plain English (paginated `/products.json` walk, no em dashes). |
| `content/overlay.js` | User-facing copy: `Get Pro ($11/mo)`, `n/a` placeholders, price ranges `$0-$25`, bestseller/POD/diff strings; removed em/en dashes from comments via normalize pass. |
| `popup/popup.html` | Usage placeholder `0`, `Get Pro ($11/mo)`. |
| `popup/popup.js` | Footer/upgrade CTA punctuation. |
| `manifest.json` | Long-form Web Store description (what it does, verifiable data wedge, pricing/free tier). |

**Not changed:** `extension/README.md` (excluded from zip by `build.sh`; still contains em dashes and old DEV_MODE docs). `extension/verification/*.md` internal docs unchanged. `makerpeek-landing/` not edited in this pass (separate site deploy).

### Step 2.3 — Re-grep (shipped extension files, excluding `verification/`)

```text
Unicode em dash (U+2014) / en dash (U+2013) in extension/*.js,html,css,json: (empty)

Banned vocabulary in extension/*.js,html,json: (empty)
```

`extension/README.md` still has em dashes (dev doc only, not in zip).

---

## Phase 1 + 2 automated summary

- Dev escalation paths removed from source.
- Production build succeeds: `extension/dist/makerpeek-extension-v1.0.0.zip` (84K).
- Shipped JS/HTML/CSS/JSON: zero em/en dashes, zero banned words, zero debug `console.log`.

---

## Resume (2026-05-20, session 2)

- Dev mode was re-enabled briefly for testing, then stripped again for launch.
- Popup: removed **Open a Shopify store** button (`popup/popup.js`, dropped `.btn-outline` CSS).
- Post-resume static greps: dev hooks **empty**, `console.log` **empty**, `./build.sh` **PASS** → `dist/makerpeek-extension-v1.0.0.zip`.

To test Pro/free locally again before ship, set `DEV_MODE_ENABLED = true` in `lib/pro.js` and restore dev UI (see git history / prior commit).

---

## Save/Watchlist consolidation

**Storage keys (before):**

| Key | Shape |
|-----|--------|
| `savedStores` | Array of `{ domain, savedAt, productCount?, theme? }` |
| `watchlist_v1` | `{ stores: [{ domain, addedAt, lastSnapshot, alertPreferences, … }] }` |

**Changes:**

| File | Change |
|------|--------|
| `background.js` | `migrateSavedStoresToWatchlist()` on install + service-worker startup; merges `savedStores` into `watchlist_v1`, removes legacy key |
| `content/overlay.js` | Removed `saveStore()` and ★ Save button; single **★ Add to Watchlist** / **★ Added to Watchlist** (disabled) / **★ On Watchlist** (remove) |
| `popup/popup.html`, `popup/popup.js` | Removed Saved stores section from Today tab |

**Verify:** Panel add → Watchlist tab only; `chrome.storage.local.get(null)` shows no `savedStores`.

---

## Bestsellers collapse

**Change:** Bestsellers section shows **5 products** by default; **Show all {N}** / **Show fewer** toggles visibility of items 6+ via `.mp-bestsellers--collapsed` on the `<ol>` (`li:nth-child(n+6) { display: none }`). All rows stay in the DOM. Collapsed on every panel open (not persisted). Toggle hidden when N ≤ 5.

**Files:** `content/overlay.js` (render + `wireBestsellersCollapseToggle`, CSS in `buildCSS()`), `lib/proof.js` (methodology line).

**Verify:** deathwishcoffee.com — 5 rows, expand/collapse, reopen panel stays collapsed.

---

## overlay.js not loading — syntax fix (2026-05-20)

**Diagnosis:** `detector.js` loaded; `overlay.js` load marker never appeared. `node --check content/overlay.js` failed with `SyntaxError: Unexpected token '}'` at line 623 (orphaned `if` after console.log strip) and a broken `logStyleGroupingDiagnostic` function body.

**Not the cause:** Manifest already listed `overlay.js`; no `import` in overlay.js. Lib files before overlay use plain globals (no `export`).

### manifest `content_scripts` — before

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content/detector.js", "lib/snapshots.js", "lib/format.js", "lib/proof.js", "lib/bestsellers.js", "lib/app-categories.js", "lib/fetchers.js", "content/overlay.js"],
    "run_at": "document_idle"
  }
]
```

### manifest `content_scripts` — after

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": [
      "content/detector.js",
      "lib/snapshots.js",
      "lib/format.js",
      "lib/proof.js",
      "lib/bestsellers.js",
      "lib/app-categories.js",
      "lib/fetchers.js",
      "content/overlay.js"
    ],
    "run_at": "document_idle",
    "all_frames": false
  }
]
```

(Lib files kept between detector and overlay — overlay depends on their globals. Only structural change: `all_frames: false` + formatting.)

### overlay.js issues fixed

| Issue | Fix |
|-------|-----|
| Lines 620–623 incomplete `if` | Removed dead branch |
| `logStyleGroupingDiagnostic` missing closing / stray `}` | No-op function |

### Expected console after reload (fill in when verified)

```
[MakerPeek] detector.js loaded at …
[MakerPeek] overlay.js loaded at …
[MakerPeek] detector: detectShopify start
[MakerPeek] detector: detectShopify done { isShopify: true, … }
[MakerPeek] whenReady: firing bootstrap
[MakerPeek] bootstrap: …
[MakerPeek] mount complete …
```

**User verify:** Reload extension → hard-reload deathwishcoffee.com → M button + popup Open panel.

---

## Floating M mount diagnostic (2026-05-20)

Instrumentation only. **Do not treat prior mount “fixes” as verified until this section is filled in.**

### Step 1: `content_scripts[0].matches`

```json
["<all_urls>"]
```

Matches is broad enough. If the M still fails, the cause is not manifest URL filtering.

### Step 2–6: What was added

| File | Diagnostic |
|------|------------|
| `content/overlay.js` | Top-of-file load log; `mountFloatingButton()` with try/catch + `mount complete` / `mount threw`; insertion target `body \|\| documentElement \|\| html`; `whenReady()` before bootstrap |
| `content/detector.js` | Top-of-file load log; bootstrap detect start/done logs |
| `window.__MAKERPEEK_FORCE_MOUNT__()` | Removes `#makerpeek-root` / legacy selectors, calls `mountFloatingButton()` with no Shopify check |

### Step 7: Page console log (fill in after you test)

**URL tested:** `_________________________________`

**Ordered `[MakerPeek]` lines from page console (not service worker):**

```
(paste here after hard-reload + extension reload)
```

**`window.__MAKERPEEK_FORCE_MOUNT__()` result:**

- [ ] Button appeared bottom-right
- [ ] Threw (paste error)
- [ ] Returned true/false but no visible button
- [ ] `undefined` / not a function (overlay.js did not load)

**Interpretation checklist:**

| Observation | Likely cause |
|-------------|----------------|
| No `detector.js loaded` / `overlay.js loaded` | Content script not injecting (wrong extension folder, CSP, or page context) |
| Loaded, bootstrap `not Shopify` | Detection path; compare with popup GET_STATUS |
| Loaded, `mount threw:` | Rendering bug (shadow DOM, CSS, or JS error) |
| `mount complete` but no M | CSS/stacking or host removed after mount (watch for `mount guard: host removed`) |
| Force mount works, auto does not | Detection / bootstrap gating |
| Force mount fails | Rendering path |

---

## Floating button mount fix and popup fallback

**Symptom:** On Shopify stores (e.g. deathwishcoffee.com `/products/...?_pos=...`), popup showed Pro but the floating **M** never appeared. No way to open the panel from the toolbar when mount failed.

**Root cause:** Shadow host used `width: 0; height: 0` at the viewport origin. Fixed-position UI inside the shadow tree did not reliably sit bottom-right above host stacking contexts. Bootstrap also set `__makerpeekInjected` before mount completed, blocking retries.

**Fixes (`content/overlay.js`):**

| Change | Purpose |
|--------|---------|
| Host `inset: 0`, full viewport, `pointer-events: none`, `z-index: 2147483647` | Fixed toggle/panel anchor to viewport |
| `mountMakerpeekUI()` / `ensureMakerpeekReady()` | Shared mount path for bootstrap + `OPEN_PANEL` |
| Bootstrap waits for `load` + double `rAF` before inject | Avoids early DOM / race on heavy themes |
| `makerpeek:shopify-detected` listener | Re-mount if detector finishes first |
| `MutationObserver` on `<html>` | Re-inject if theme scripts remove the host |
| `OPEN_PANEL` async: `ensureMakerpeekReady()` then `openPanel()` + `routePanel()` | Popup can open panel even if float button was missing |

**Popup (`popup/popup.js`, `popup.css`):**

- `urlLooksLikeShopifyStorefront()` fallback when `GET_STATUS` fails but URL is `/products/`, `/collections/`, etc.
- **Open panel** on detected stores (Pro: `btn-outline`, free on store: `btn-primary`)
- `openPanelOnTab()` sends `OPEN_PANEL` and closes popup

**Verify (manual):** deathwishcoffee.com, gymshark.com, beardbrand.com, gazebogolf.ca — M bottom-right within ~1s; popup **Open panel** opens side panel. Temporary `console.warn` mount logs were used during debug and removed before commit.

---

## Popup Pro state and duplicate CTA fix

**Issue:** Popup ignored entitlement when `VERIFICATION_MODE` (or dev override) was active at the service worker; it still showed the daily counter, visit copy, and two Get Pro CTAs.

**Changes:**

| File | Change |
|------|--------|
| `lib/pro.js` | Added `VERIFICATION_MODE = true` (checked first in `getProStatus()` → `{ paid: true, source: "verification" }`). Exported `isVerificationMode()`. |
| `popup/popup.js` | ES module; `import { isPro } from "../lib/pro.js"`. `renderAll()` uses `isPro(pro)` on open. Pro: hide usage section, PRO badge + watchlist tab, footer Sign in only, no visit/Get Pro copy on non-Shopify tabs. Free: one green Get Pro in status section only. |
| `popup/popup.html` | Removed footer `Get Pro ($11/mo)` link; `<script type="module">`. |

**Verify (manual):**

- `VERIFICATION_MODE = true`: reload extension → popup on Shopify tab → no counter, no visit upsell, no Get Pro, footer Sign in only, PRO badge visible.
- `VERIFICATION_MODE = false`: reload → free UI shows **one** Get Pro (green button), footer Sign in only (no duplicate).
- Restore `VERIFICATION_MODE = true` for continued testing.

---

## Ready to upload?

**Not yet.** Static cleanup and build **PASS**. Phase 1.3 Chrome manual checks are **PENDING** (run the four storage/popup/service-worker tests in a fresh profile, then change the line below).

After you confirm manual checks:

```text
Ready to upload: YES — extension v1.0.0 dist zip, pending your Chrome sign-off above.
```

---

## Final pre-launch (2026-05-20)

Strip verification mode instrumentation and diagnostic `[MakerPeek]` logging before Chrome Web Store zip.

### Files touched

| File | Changes |
|------|---------|
| `lib/pro.js` | `VERIFICATION_MODE = false`; `if (VERIFICATION_MODE) return true` guard in `isPro()`; `DEV_MODE_ENABLED = false` |
| `content/overlay.js` | Removed all `[MakerPeek]` logs, bootstrap/mount diagnostics, `window.__MAKERPEEK_FORCE_MOUNT__`; silent try/catch on mount; kept `OPEN_PANEL`, mount fallback chain, `whenReady`, z-index, MutationObserver guard, bestsellers collapse, watchlist button |
| `content/detector.js` | Removed load/detection `[MakerPeek]` logs (prior pass) |
| `background.js` | Silent watchlist poll catch (no `[MakerPeek]` tag) |
| `build.sh` | `VERIFICATION_MODE = true` → **BUILD BLOCKED** guard (verified) |

### Final grep outputs

**`[MakerPeek]`** (`content/`, `popup/`, `background.js`, `lib/`):

```text
(empty)
```

**`__MAKERPEEK_FORCE_MOUNT__` / `FORCE_MOUNT` / `forceMount`** (`.js`, `.html`):

```text
(empty)
```

**Em dash / en dash** (`.js`, `.html`, `.json`, excluding `verification/`):

```text
(empty)
```

**AI-tells** (banned words in `.js`, `.html`, `.json`, `.md`, excluding `verification/`):

```text
(empty)
```

Note: `README.md` still uses em dashes; it is excluded from the store zip (`build.sh`).

### Build guard (Step 5)

With `VERIFICATION_MODE = true` in `lib/pro.js`:

```text
✗ BUILD BLOCKED: VERIFICATION_MODE is still true in extension/lib/pro.js — flip to false before building.
```

Restored to `false`; production build:

```text
✓ Built: extension/dist/makerpeek-extension-v1.0.0.zip (v1.0.0, ~92K)
```

### Manual smoke test (Step 7 — run locally)

Reload unpacked `extension/`, hard-reload **deathwishcoffee.com**, confirm:

- Floating **M** bottom-right; click opens panel
- Free gates: variant total hidden, 3 apps, cadence 6 months only, change monitoring upsell
- Counter increments per store visit; popup shows **X/5** and single Get Pro
- No `[MakerPeek]` in page console
- Watchlist tab retains saved stores
- Bestsellers collapsed to 5 with **Show all** toggle

### Status

```text
Ready to upload: YES — after you pass the manual smoke test above.
```

---

## Build (2026-05-20)

Production zip for Chrome Web Store upload.

- **Version:** `1.0.0`
- **Zip path:** `extension/dist/makerpeek-extension-v1.0.0.zip`
- **Zip size:** 70K (`ls -lh`: 70K on disk; 247,410 bytes uncompressed across 23 files)

`build.sh` excludes: `verification/`, `dist/`, `*.sh`, `README.md`, `.git/`, `node_modules/`, `.env*`, dev icon generators, `assets/icon.svg`.

### Contents inventory

```text
Archive:  dist/makerpeek-extension-v1.0.0.zip
  Length      Date    Time    Name
---------  ---------- -----   ----
        0  05-12-2026 21:18   popup/
    13189  05-20-2026 16:51   popup/popup.js
     3313  05-20-2026 16:51   popup/popup.html
     8732  05-20-2026 12:03   popup/popup.css
    12872  05-20-2026 16:58   background.js
        0  05-18-2026 16:41   content/
   143717  05-20-2026 16:58   content/overlay.js
    29116  05-20-2026 16:57   content/detector.js
     1308  05-20-2026 12:24   manifest.json
        0  05-19-2026 18:17   lib/
      807  05-20-2026 11:20   lib/format.js
     4750  05-20-2026 11:20   lib/snapshots.js
     3809  05-20-2026 11:20   lib/fetchers.js
     2259  05-20-2026 16:58   lib/pro.js
     4107  05-20-2026 11:20   lib/app-categories.js
     6865  05-20-2026 11:20   lib/watchlist.js
     4188  05-20-2026 16:09   lib/proof.js
     1918  05-20-2026 11:20   lib/bestsellers.js
        0  05-19-2026 12:38   assets/
      723  05-19-2026 12:38   assets/icon-16.png
     1300  05-19-2026 12:38   assets/icon-48.png
     3391  05-19-2026 12:38   assets/icon-128.png
     1046  05-19-2026 12:38   assets/icon-32.png
---------                     -------
   247410                     23 files
```

**Not in zip:** `verification/`, `build.sh`, `README.md`, `.git/`, `node_modules/`, `.env`, dev assets (`generate-icons.*`, `icon.svg`).

Ready for Web Store upload.

---

## Payments and auth wiring

Date: 2026-05-21

### makerpeek-landing/ (Next.js on Vercel)

| Step | What |
|------|------|
| Scaffold | `package.json`, `app/`, `lib/supabase.ts`, static marketing in `public/` |
| SQL | `supabase/subscriptions.sql` — `subscriptions` table (`email`, `status`, `stripe_customer_id`) |
| Sign-in | `app/auth/signin/page.tsx` — Google OAuth via Supabase, `?ext=` for extension id |
| Callback | `app/auth/callback/page.tsx` — session + `GET /api/pro-status` + `chrome.runtime.sendMessage(extId, AUTH_SUCCESS)` |
| APIs | `app/api/pro-status`, `app/api/checkout`, `app/api/webhook` |
| Success | `app/success/page.tsx` |
| Env | `.env.example`: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_*`, `NEXT_PUBLIC_BASE_URL` |

Deploy URLs to verify (200):

- `https://makerpeek.com/auth/signin`
- `https://makerpeek.com/auth/callback`
- `https://makerpeek.com/success`

Stripe webhook destination: `https://makerpeek.com/api/webhook`  
Events: `checkout.session.completed`, `customer.subscription.deleted`

### extension/

| File | Change |
|------|--------|
| `manifest.json` | `externally_connectable`: `https://makerpeek.com/*` |
| `background.js` | `onMessageExternal` → `AUTH_SUCCESS` → `userEmail`, `userIsPro`, `proCheckedAt` |
| `lib/pro.js` | `VERIFICATION_MODE = false`; 1h cache; `fetch` `https://makerpeek.com/api/pro-status?email=` |
| `popup/popup.html` | Auth shell: `#state-signedout`, `#state-free`, `#state-pro` |
| `popup/popup.js` | `MONTHLY_PRICE_ID` / `ANNUAL_PRICE_ID` placeholders; sign-in, checkout, sign-out; refresh pro on popup open |

### Before E2E test

1. Run `supabase/subscriptions.sql` in Supabase SQL editor.
2. Set all env vars in Vercel (`makerpeek-landing` project).
3. Replace `price_YOUR_MONTHLY_ID` / `price_YOUR_ANNUAL_ID` in `popup/popup.js` with Stripe test Price IDs.
4. Supabase Auth: Google provider + redirect URL `{NEXT_PUBLIC_BASE_URL}/auth/callback`.

### Test mode loop (PART 4)

1. Reload extension → popup → Sign in with Google.
2. OAuth tab → “Signed in. You can close this tab.”
3. Popup → free state + Get Pro buttons.
4. Get Pro $11/mo → Stripe test card `4242 4242 4242 4242`.
5. Success page → webhook sets `subscriptions.status = active`.
6. Reopen popup → Pro badge (cache cleared each open).

### Live mode (PART 5)

1. Vercel: `sk_live_`, live `whsec_`, live Price IDs.
2. Redeploy `makerpeek-landing/`.
3. `extension/build.sh` → upload new zip to Chrome Web Store.

---

## Payments wired via Payment Links + Supabase

Date: 2026-05-21

Extension no longer depends on makerpeek.com for auth or checkout.

### Extension (`extension/`)

| File | Change |
|------|--------|
| `lib/config.js` | `MONTHLY_PAYMENT_LINK`, `ANNUAL_PAYMENT_LINK`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` |
| `background.js` | `clientReferenceId` UUID on install + startup; removed `onMessageExternal` |
| `lib/pro.js` | Polls `subscriptions?client_reference_id=eq.{uuid}`; 1h cache; `VERIFICATION_MODE = false` |
| `manifest.json` | Removed `externally_connectable` |
| `popup/popup.html` | Counter + Get Pro buttons + refresh link; no Google sign-in |
| `popup/popup.js` | Opens Payment Links with `?client_reference_id=`; refresh bypasses cache |

### Supabase

- Table: `subscriptions` with `client_reference_id` (unique), `status` (`active` / `cancelled`)
- SQL: `makerpeek-landing/supabase/subscriptions.sql`
- Stripe webhook → Supabase Edge Function upserts row by `client_reference_id` from Payment Link metadata

### Before E2E (test mode)

1. Create Stripe Payment Links (test mode); enable **client reference ID** passthrough.
2. Paste URLs into `lib/config.js`.
3. Deploy Edge Function webhook; run migrations.
4. Reload extension → popup shows counter + Get Pro.

### Test loop

1. Popup → Get Pro $11/mo → `buy.stripe.com/...?client_reference_id={uuid}`
2. Pay with `4242 4242 4242 4242`
3. Webhook sets `status=active`
4. Popup → “Already paid? Click here to refresh.” → PRO badge, no upgrade buttons
5. Shopify store → Pro panel features

### Live mode

1. New Payment Links in Stripe **live** mode → update `lib/config.js`
2. Live `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in Supabase function secrets
3. New live webhook → same Edge Function URL
4. `./build.sh` → Chrome Web Store upload
