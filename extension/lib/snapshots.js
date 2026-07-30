// MakerPeek - Snapshot persistence & diff computation
// Plain global script (no ES module syntax). Loaded as a content script before overlay.js.
// Content scripts have access to chrome.storage.local when "storage" permission is declared.

const MP_SNAP_VERSION = 1;
const MP_SNAP_PREFIX  = 'mp_snap_v1:';
const MP_SNAP_MAX     = 5; // keep at most N snapshots per store

// ─── Build ────────────────────────────────────────────────────────────────────

function buildSnapshot(domain, products, capturedAt) {
  const slim = {};
  for (const p of products) {
    const fv = p.variants?.[0];
    if (!fv) continue;
    slim[String(p.id)] = {
      title:           p.title,
      handle:          p.handle,
      available:       p.variants.some((v) => v.available !== false),
      price:           parseFloat(fv.price) || 0,
      compare_at_price: fv.compare_at_price ? parseFloat(fv.compare_at_price) : null,
      variant_count:   p.variants.length,
    };
  }
  return {
    version:      MP_SNAP_VERSION,
    domain,
    capturedAt:   capturedAt || new Date().toISOString(),
    products:     slim,
    productCount: Object.keys(slim).length,
  };
}

// ─── Storage ──────────────────────────────────────────────────────────────────

async function getPreviousSnapshot(domain) {
  const key    = `${MP_SNAP_PREFIX}${domain}`;
  const stored = await chrome.storage.local.get(key);
  const hist   = stored[key] || [];
  return hist.length > 0 ? hist[hist.length - 1] : null;
}

async function persistSnapshot(snapshot, domain) {
  const key    = `${MP_SNAP_PREFIX}${domain}`;
  const stored = await chrome.storage.local.get(key);
  const hist   = stored[key] || [];
  hist.push(snapshot);
  while (hist.length > MP_SNAP_MAX) hist.shift();
  await chrome.storage.local.set({ [key]: hist });
}

async function getSnapshotHistoryInfo(domain) {
  const key    = `${MP_SNAP_PREFIX}${domain}`;
  const stored = await chrome.storage.local.get(key);
  const hist   = stored[key] || [];
  return {
    count:        hist.length,
    dates:        hist.map((s) => s.capturedAt),
    approxSizeKB: Math.round(JSON.stringify(hist).length / 1024),
  };
}

async function clearSnapshots(domain) {
  const key = `${MP_SNAP_PREFIX}${domain}`;
  await chrome.storage.local.remove(key);
}

// ─── Diff ─────────────────────────────────────────────────────────────────────

function computeDiff(previous, current) {
  if (!previous || !previous.products || !current || !current.products) return null;

  const prevIds = new Set(Object.keys(previous.products));
  const currIds = new Set(Object.keys(current.products));

  const added      = [];
  const removed    = [];
  const wentOOS    = [];
  const restocked  = [];
  const priceUp    = [];
  const priceDown  = [];
  const newlyOnSale = [];
  const saleEnded  = [];

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

    if (prev.available && !curr.available) wentOOS.push({ id, title: curr.title });
    if (!prev.available && curr.available) restocked.push({ id, title: curr.title });

    if (prev.price > 0 && curr.price > 0 && curr.price > prev.price)
      priceUp.push({ id, title: curr.title, from: prev.price, to: curr.price });
    if (prev.price > 0 && curr.price > 0 && curr.price < prev.price)
      priceDown.push({ id, title: curr.title, from: prev.price, to: curr.price });

    const prevOnSale = prev.compare_at_price != null && prev.compare_at_price > prev.price;
    const currOnSale = curr.compare_at_price != null && curr.compare_at_price > curr.price;
    if (!prevOnSale && currOnSale) newlyOnSale.push({ id, title: curr.title });
    if (prevOnSale && !currOnSale) saleEnded.push({ id, title: curr.title });
  }

  const msBetween = new Date(current.capturedAt) - new Date(previous.capturedAt);

  return {
    previousCapturedAt: previous.capturedAt,
    currentCapturedAt:  current.capturedAt,
    daysBetween:        msBetween / (1000 * 60 * 60 * 24),
    added, removed, wentOOS, restocked,
    priceUp, priceDown, newlyOnSale, saleEnded,
  };
}
