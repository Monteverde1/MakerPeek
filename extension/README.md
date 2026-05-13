# MakerPeek Chrome Extension

Manifest V3 Chrome extension. Load it unpacked during development.

## Load unpacked into Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `extension/` folder inside this repo
5. The MakerPeek icon should appear in your toolbar

## File map

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest — permissions, icons, scripts |
| `background.js` | Service worker — relays messages to backend |
| `content/detector.js` | Detects Shopify stores on page load |
| `content/overlay.js` | Injects the analysis panel on Shopify pages |
| `popup/popup.html` | Extension popup UI |
| `popup/popup.js` | Popup logic (sign-in, usage counter) |
| `popup/popup.css` | Popup styles |
| `assets/` | Extension icons (replace before publishing) |

## Development notes

- Content scripts run with `run_at: document_idle`.
- All API calls must go through the **Next.js backend** (`/api/*`) — never call
  Anthropic or Supabase directly from the extension.
- Set `NEXT_PUBLIC_APP_URL` to `http://localhost:3000` during local development
  so the extension hits your local server.
- After editing any file, go to `chrome://extensions` and click the **reload ↺**
  button on the MakerPeek card.
