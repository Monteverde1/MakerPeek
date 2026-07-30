// MakerPeek - Watchlist module
// ES module. Imported by background.js; content scripts interact via chrome.runtime.sendMessage.
//
// Storage key: watchlist_v1  (chrome.storage.local)
// Per-store diff cache key: watchlist_diff_v1:{domain}

import { getProStatus } from './pro.js';

export const WATCHLIST_KEY        = 'watchlist_v1';
export const WATCHLIST_DIFF_PREFIX = 'watchlist_diff_v1:';
export const WATCHLIST_MAX        = 25;
export const POLL_MIN_INTERVAL_H  = 22;  // re-poll if lastPolledAt older than this

// ─── Default alert preferences ────────────────────────────────────────────────

function defaultPrefs() {
  return {
    newProducts:           true,
    restocks:              true,
    priceDrops:            true,
    priceDropThresholdPct: 10,
    newSales:              true,
    removed:               true,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getWatchlist() {
  const stored = await chrome.storage.local.get(WATCHLIST_KEY);
  return stored[WATCHLIST_KEY] || { stores: [] };
}

export async function isWatched(domain) {
  const wl = await getWatchlist();
  return wl.stores.some((s) => s.domain === domain);
}

/**
 * Add a store to the watchlist.
 * Returns { ok: true } on success.
 * Returns { ok: false, reason: 'not_pro' | 'limit_reached' } on failure.
 */
export async function addStore(domain, initialSnapshot) {
  const { paid } = await getProStatus();
  if (!paid) return { ok: false, reason: 'not_pro' };

  const wl = await getWatchlist();
  if (wl.stores.some((s) => s.domain === domain)) return { ok: true }; // already present
  if (wl.stores.length >= WATCHLIST_MAX) return { ok: false, reason: 'limit_reached' };

  wl.stores.push({
    domain,
    addedAt:          new Date().toISOString(),
    lastPolledAt:     null,
    lastSnapshot:     initialSnapshot ?? null,
    lastError:        null,
    alertPreferences: defaultPrefs(),
  });
  await _saveWatchlist(wl);
  return { ok: true };
}

export async function removeStore(domain) {
  const wl = await getWatchlist();
  wl.stores = wl.stores.filter((s) => s.domain !== domain);
  await _saveWatchlist(wl);
  // Clean up cached diff
  await chrome.storage.local.remove(`${WATCHLIST_DIFF_PREFIX}${domain}`);
}

export async function updateAlertPreferences(domain, prefs) {
  const wl = await getWatchlist();
  const store = wl.stores.find((s) => s.domain === domain);
  if (!store) return;
  store.alertPreferences = { ...store.alertPreferences, ...prefs };
  await _saveWatchlist(wl);
}

// ─── Snapshot helpers (mirrors snapshots.js slim format) ─────────────────────

/**
 * Build a slim snapshot from a raw /products.json products array.
 * Shape matches the slim format used by snapshots.js buildSnapshot().
 */
export function buildSlimSnapshot(products, fetchedAt) {
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

/**
 * Compute a diff between two slim snapshots.
 * Returns { added, removed, wentOOS, restocked, priceDown, newlyOnSale, computedAt }.
 */
export function computeWatchlistDiff(previous, current) {
  if (!previous?.products || !current?.products) return null;

  const prevIds = new Set(Object.keys(previous.products));
  const currIds = new Set(Object.keys(current.products));

  const added = [], removed = [], wentOOS = [], restocked = [], priceDown = [], newlyOnSale = [];

  for (const id of currIds) {
    if (!prevIds.has(id)) added.push({ id, ...current.products[id] });
  }
  for (const id of prevIds) {
    if (!currIds.has(id)) removed.push({ id, ...previous.products[id] });
  }
  for (const id of currIds) {
    if (!prevIds.has(id)) continue;
    const prev = previous.products[id];
    const curr = current.products[id];

    if (prev.available && !curr.available)  wentOOS.push({ id, title: curr.title });
    if (!prev.available && curr.available)  restocked.push({ id, title: curr.title });

    if (prev.price > 0 && curr.price > 0 && curr.price < prev.price) {
      const pct = ((prev.price - curr.price) / prev.price) * 100;
      priceDown.push({ id, title: curr.title, from: prev.price, to: curr.price, pct });
    }

    const prevOnSale = prev.compare_at_price != null && prev.compare_at_price > prev.price;
    const currOnSale = curr.compare_at_price != null && curr.compare_at_price > curr.price;
    if (!prevOnSale && currOnSale) newlyOnSale.push({ id, title: curr.title });
  }

  return { added, removed, wentOOS, restocked, priceDown, newlyOnSale, computedAt: new Date().toISOString() };
}

/**
 * Apply alertPreferences to a diff.
 * Returns an array of human-readable summary strings for qualifying changes.
 */
export function filterDiff(diff, prefs) {
  if (!diff) return [];
  const parts = [];
  if (prefs.newProducts && diff.added.length > 0)
    parts.push(`${diff.added.length} new product${diff.added.length !== 1 ? 's' : ''}`);
  if (prefs.removed && diff.removed.length > 0)
    parts.push(`${diff.removed.length} removed`);
  if (prefs.restocks && diff.restocked.length > 0)
    parts.push(`${diff.restocked.length} restock${diff.restocked.length !== 1 ? 's' : ''}`);
  if (prefs.priceDrops) {
    const threshold = prefs.priceDropThresholdPct ?? 10;
    const drops = diff.priceDown.filter((p) => p.pct >= threshold);
    if (drops.length > 0)
      parts.push(`${drops.length} price drop${drops.length !== 1 ? 's' : ''}`);
  }
  if (prefs.newSales && diff.newlyOnSale.length > 0)
    parts.push(`${diff.newlyOnSale.length} new sale${diff.newlyOnSale.length !== 1 ? 's' : ''}`);
  return parts;
}

// ─── Internal helpers used by background poller ───────────────────────────────

/** Patch a single store record without re-reading twice. */
export async function updateStoreRecord(domain, patch) {
  const wl = await getWatchlist();
  const store = wl.stores.find((s) => s.domain === domain);
  if (!store) return;
  Object.assign(store, patch);
  await _saveWatchlist(wl);
}

async function _saveWatchlist(wl) {
  await chrome.storage.local.set({ [WATCHLIST_KEY]: wl });
}
