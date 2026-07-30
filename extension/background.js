// MakerPeek - Background Service Worker (MV3, ES module)

import { getProStatus } from "./lib/pro.js";
import { MONTHLY_PAYMENT_LINK } from "./lib/config.js";
import {
  getWatchlist,
  addStore,
  removeStore,
  isWatched,
  updateAlertPreferences,
  buildSlimSnapshot,
  computeWatchlistDiff,
  filterDiff,
  updateStoreRecord,
  WATCHLIST_DIFF_PREFIX,
  WATCHLIST_KEY,
  WATCHLIST_MAX,
  POLL_MIN_INTERVAL_H,
} from "./lib/watchlist.js";

const FREE_LIMIT = 5;
const LEGACY_SAVED_STORES_KEY = "savedStores";

function defaultWatchlistPrefs() {
  return {
    newProducts: true,
    restocks: true,
    priceDrops: true,
    priceDropThresholdPct: 10,
    newSales: true,
    removed: true,
  };
}

/** One-time: merge legacy savedStores[] into watchlist_v1.stores, then delete savedStores. */
async function migrateSavedStoresToWatchlist() {
  const data = await chrome.storage.local.get([LEGACY_SAVED_STORES_KEY, WATCHLIST_KEY]);
  const legacy = data[LEGACY_SAVED_STORES_KEY];
  if (!Array.isArray(legacy) || legacy.length === 0) {
    if (legacy != null) await chrome.storage.local.remove(LEGACY_SAVED_STORES_KEY);
    return;
  }

  const wl = data[WATCHLIST_KEY] || { stores: [] };
  const seen = new Set((wl.stores || []).map((s) => s.domain));

  for (const entry of legacy) {
    const domain = entry?.domain;
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    wl.stores.push({
      domain,
      addedAt: entry.savedAt || new Date().toISOString(),
      lastPolledAt: null,
      lastSnapshot: null,
      lastError: null,
      alertPreferences: defaultWatchlistPrefs(),
    });
  }

  await chrome.storage.local.set({ [WATCHLIST_KEY]: wl });
  await chrome.storage.local.remove(LEGACY_SAVED_STORES_KEY);
}

// ── Alarm name ────────────────────────────────────────────────────────────────
const ALARM_WATCHLIST_POLL = "watchlist_poll";
const ALARM_PERIOD_MINUTES = 360; // every 6 hours
const STORE_POLL_INTERVAL_MS = 30_000; // 30s between stores in a single alarm fire

// ── Client reference ID (Stripe Payment Link → Supabase webhook) ─────────────

async function ensureClientReferenceId() {
  const data = await chrome.storage.local.get("clientReferenceId");
  if (!data.clientReferenceId) {
    await chrome.storage.local.set({ clientReferenceId: crypto.randomUUID() });
  }
}

void ensureClientReferenceId();

// ── Register alarm on install / service-worker startup ───────────────────────

chrome.runtime.onInstalled.addListener(async () => {
  const data = await chrome.storage.local.get("clientReferenceId");
  if (!data.clientReferenceId) {
    await chrome.storage.local.set({ clientReferenceId: crypto.randomUUID() });
  }
  chrome.alarms.create(ALARM_WATCHLIST_POLL, { periodInMinutes: ALARM_PERIOD_MINUTES });
  void migrateSavedStoresToWatchlist();
});

void migrateSavedStoresToWatchlist();

// Also ensure the alarm exists on every service-worker wake (in case it was cleared)
chrome.alarms.get(ALARM_WATCHLIST_POLL, (alarm) => {
  if (!alarm) {
    chrome.alarms.create(ALARM_WATCHLIST_POLL, { periodInMinutes: ALARM_PERIOD_MINUTES });
  }
});

// ── Alarm handler ─────────────────────────────────────────────────────────────

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_WATCHLIST_POLL) {
    runWatchlistPoll().catch(() => {});
  }
});

// ── Background product fetch (service-worker-safe, no DOM) ───────────────────

const BG_PRODUCTS_PAGE_TIMEOUT_MS = 7000;

async function fetchProductsPageBg(domain, page, timeoutMs, isRetryAfter429 = false) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://${domain}/products.json?page=${page}&limit=250`, {
      signal:  ctrl.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);

    if (res.status === 429 && !isRetryAfter429) {
      await new Promise((r) => setTimeout(r, 1500));
      return fetchProductsPageBg(domain, page, timeoutMs, true);
    }

    if (res.status === 429) throw new Error("rate_limited");
    if (res.status === 403) throw new Error("access_denied");
    if (!res.ok) throw new Error(`http_${res.status}`);

    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("json")) throw new Error("not_json");

    const data = await res.json();
    const products = data.products || [];
    return Array.isArray(products) ? products : [];
  } catch (e) {
    clearTimeout(timer);
    if (e?.name === "AbortError") throw new Error("page_timeout");
    throw e;
  }
}

async function fetchProductsBg(domain, maxPages = 10) {
  const seen       = new Map();
  const fetchedAt  = new Date().toISOString();
  const MAX_UNIQUE = 2500;

  for (let page = 1; page <= maxPages; page++) {
    let batch;
    try {
      batch = await fetchProductsPageBg(domain, page, BG_PRODUCTS_PAGE_TIMEOUT_MS);
    } catch (e) {
      throw new Error(`fetch_failed: ${e.message}`);
    }

    for (const p of batch) {
      if (p.id && !seen.has(p.id)) seen.set(p.id, p);
    }

    if (batch.length === 0) break;
    if (batch.length < 250) break;
    if (seen.size >= MAX_UNIQUE) break;
  }

  return { products: Array.from(seen.values()), fetchedAt };
}

// ── Watchlist polling orchestrator ────────────────────────────────────────────

async function runWatchlistPoll() {
  const { paid } = await getProStatus();
  if (!paid) return;

  const wl = await getWatchlist();
  if (wl.stores.length === 0) return;

  // Rotate through stores using a cursor so large watchlists spread across windows
  const { watchlistNextPollIndex = 0 } = await chrome.storage.local.get(
    "watchlistNextPollIndex"
  );
  const storeCount = wl.stores.length;
  const nowMs = Date.now();

  for (let i = 0; i < storeCount; i++) {
    const idx = (watchlistNextPollIndex + i) % storeCount;
    const store = wl.stores[idx];

    // Skip if polled recently (within 22h)
    const staleThresholdMs = POLL_MIN_INTERVAL_H * 60 * 60 * 1000;
    if (
      store.lastPolledAt &&
      nowMs - new Date(store.lastPolledAt).getTime() < staleThresholdMs
    ) {
      continue;
    }

    await pollOneStore(store);

    // Advance cursor past this store
    await chrome.storage.local.set({
      watchlistNextPollIndex: (idx + 1) % storeCount,
    });

    // Throttle: wait 30s before polling the next store (skip delay after last)
    if (i < storeCount - 1) {
      await new Promise((r) => setTimeout(r, STORE_POLL_INTERVAL_MS));
    }
  }
}

async function pollOneStore(store) {
  const { domain } = store;

  let products, fetchedAt;
  try {
    ({ products, fetchedAt } = await fetchProductsBg(domain));
  } catch (err) {
    await updateStoreRecord(domain, {
      lastError: err.message,
      lastPolledAt: new Date().toISOString(),
    });
    return;
  }

  const currentSnapshot = buildSlimSnapshot(products, fetchedAt);
  const diff = computeWatchlistDiff(store.lastSnapshot, currentSnapshot);
  const prefs = store.alertPreferences;
  const changeParts = diff ? filterDiff(diff, prefs) : [];

  // Persist diff for popup display
  await chrome.storage.local.set({
    [`${WATCHLIST_DIFF_PREFIX}${domain}`]: {
      diff,
      summary: changeParts,
      computedAt: diff?.computedAt || fetchedAt,
    },
  });

  // Update store record
  await updateStoreRecord(domain, {
    lastPolledAt: new Date().toISOString(),
    lastSnapshot: currentSnapshot,
    lastError: null,
  });

  // Fire notification if there are qualifying changes
  if (changeParts.length > 0) {
    const notifId = `mp-watchlist-${domain}-${Date.now()}`;
    chrome.notifications.create(notifId, {
      type:    "basic",
      iconUrl: chrome.runtime.getURL("assets/icon-48.png"),
      title:   domain,
      message: changeParts.join(", "),
    });

    // On notification click: open domain in new tab
    chrome.notifications.onClicked.addListener(function onNotifClick(id) {
      if (id !== notifId) return;
      chrome.notifications.onClicked.removeListener(onNotifClick);
      chrome.tabs.create({ url: `https://${domain}` });
    });
  }
}

// ── Daily usage helpers ───────────────────────────────────────────────────────

function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}

async function getUsage() {
  return new Promise((resolve) => {
    chrome.storage.local.get("dailyViews", ({ dailyViews }) => {
      const today = todayUTC();
      if (!dailyViews || dailyViews.date !== today) {
        resolve({ count: 0, date: today });
      } else {
        resolve(dailyViews);
      }
    });
  });
}

async function incrementUsage() {
  const usage = await getUsage();
  usage.count += 1;
  await new Promise((resolve) =>
    chrome.storage.local.set({ dailyViews: usage }, resolve)
  );
  return usage;
}

// ── Message router ────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // ── Pro status ────────────────────────────────────────────────────────────
  if (message.type === "GET_PRO_STATUS") {
    getProStatus().then(sendResponse);
    return true;
  }

  // ── Open upgrade page ─────────────────────────────────────────────────────
  if (message.type === "OPEN_UPGRADE") {
    (async () => {
      const { clientReferenceId } = await chrome.storage.local.get("clientReferenceId");
      const ref = clientReferenceId ? `?client_reference_id=${clientReferenceId}` : "";
      chrome.tabs.create({ url: `${MONTHLY_PAYMENT_LINK}${ref}` });
      sendResponse({ ok: true });
    })();
    return true;
  }

  // ── Daily usage counter - skip increment for paid users ───────────────────
  if (message.type === "STORE_VIEWED") {
    (async () => {
      const { paid } = await getProStatus();
      if (paid) {
        sendResponse({ count: 0, limit: -1, paid: true });
      } else {
        const usage = await incrementUsage();
        sendResponse({ count: usage.count, limit: FREE_LIMIT, paid: false });
      }
    })();
    return true;
  }

  // ── Usage read (popup) ────────────────────────────────────────────────────
  if (message.type === "GET_USAGE") {
    (async () => {
      const { paid } = await getProStatus();
      if (paid) {
        sendResponse({ count: 0, limit: -1, paid: true });
      } else {
        const usage = await getUsage();
        sendResponse({ count: usage.count, limit: FREE_LIMIT, paid: false });
      }
    })();
    return true;
  }

  // ── Watchlist: read ───────────────────────────────────────────────────────
  if (message.type === "WATCHLIST_GET") {
    getWatchlist().then(sendResponse);
    return true;
  }

  // ── Watchlist: is this domain watched? ───────────────────────────────────
  if (message.type === "WATCHLIST_IS_WATCHED") {
    isWatched(message.domain).then((watching) => sendResponse({ watching }));
    return true;
  }

  // ── Watchlist: add ────────────────────────────────────────────────────────
  if (message.type === "WATCHLIST_ADD") {
    addStore(message.domain, message.snapshot).then(sendResponse);
    return true;
  }

  // ── Watchlist: remove ─────────────────────────────────────────────────────
  if (message.type === "WATCHLIST_REMOVE") {
    removeStore(message.domain).then(() => sendResponse({ ok: true }));
    return true;
  }

  // ── Watchlist: update alert preferences ──────────────────────────────────
  if (message.type === "WATCHLIST_UPDATE_PREFS") {
    updateAlertPreferences(message.domain, message.prefs).then(() =>
      sendResponse({ ok: true })
    );
    return true;
  }

  // ── Watchlist: get cached diff for a domain ───────────────────────────────
  if (message.type === "WATCHLIST_GET_DIFF") {
    chrome.storage.local
      .get(`${WATCHLIST_DIFF_PREFIX}${message.domain}`)
      .then((stored) => {
        sendResponse(
          stored[`${WATCHLIST_DIFF_PREFIX}${message.domain}`] || null
        );
      });
    return true;
  }

  if (message.type === "WATCHLIST_POLL_NOW") {
    runWatchlistPoll().then(() => sendResponse({ ok: true }));
    return true;
  }
});
