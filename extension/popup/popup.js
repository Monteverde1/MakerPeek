// PRICING: $11/mo or $81/yr annual
// MakerPeek - Popup script

import { checkIsPro, isPro } from "../lib/pro.js";
import { MONTHLY_PAYMENT_LINK, ANNUAL_PAYMENT_LINK } from "../lib/config.js";

const FREE_LIMIT = 5;
const WATCHLIST_KEY = "watchlist_v1";
const WATCHLIST_DIFF_PREFIX = "watchlist_diff_v1:";
const WATCHLIST_MAX = 25;

function urlLooksLikeShopifyStorefront(url) {
  if (!url || !url.startsWith("https://")) return false;
  try {
    const u = new URL(url);
    if (/\.myshopify\.com$/i.test(u.hostname)) return true;
    const p = u.pathname;
    return (
      p === "/" ||
      /^\/products\//i.test(p) ||
      /^\/collections\//i.test(p) ||
      /^\/pages\//i.test(p) ||
      /^\/cart/i.test(p)
    );
  } catch {
    return false;
  }
}

function tabStoreContext(tab, messageResult) {
  const fromMsg = messageResult && !chrome.runtime.lastError;
  const isShopify = fromMsg
    ? messageResult.confidence
      ? messageResult.confidence === "confirmed"
      : !!messageResult.isShopify
    : urlLooksLikeShopifyStorefront(tab?.url);
  let domain = fromMsg && messageResult.domain ? messageResult.domain : null;
  if (!domain && tab?.url) {
    try {
      domain = new URL(tab.url).hostname;
    } catch {
      domain = null;
    }
  }
  return { isShopify, domain };
}

async function openPaymentLink(baseUrl) {
  const { clientReferenceId } = await chrome.storage.local.get("clientReferenceId");
  const ref = clientReferenceId ? `?client_reference_id=${clientReferenceId}` : "";
  chrome.tabs.create({ url: `${baseUrl}${ref}` });
  window.close();
}

document.addEventListener("DOMContentLoaded", function () {
  const proBadge = document.getElementById("pro-badge");
  const counterSection = document.getElementById("counter-section");
  const upgradeSection = document.getElementById("upgrade-section");
  const tabStrip = document.getElementById("js-tab-strip");
  const tabToday = document.getElementById("js-tab-today");
  const tabWatchlist = document.getElementById("js-tab-watchlist");
  const paneToday = document.getElementById("js-pane-today");
  const paneWatchlist = document.getElementById("js-pane-watchlist");
  const countEl = document.getElementById("js-count");
  const progressEl = document.getElementById("js-progress");
  const statusSection = document.getElementById("js-status-section");
  const runDetectionBtn = document.getElementById("js-run-detection");
  const diagOutput = document.getElementById("js-diag-output");

  async function renderPopup() {
    const pro = await checkIsPro();
    if (counterSection) counterSection.style.display = pro ? "none" : "block";
    if (upgradeSection) upgradeSection.style.display = pro ? "none" : "block";
    if (proBadge) proBadge.style.display = pro ? "inline-block" : "none";
    if (tabStrip) tabStrip.hidden = !pro;
    return pro;
  }

  document.getElementById("btn-pro-monthly")?.addEventListener("click", () => {
    void openPaymentLink(MONTHLY_PAYMENT_LINK);
  });

  document.getElementById("btn-pro-annual")?.addEventListener("click", () => {
    void openPaymentLink(ANNUAL_PAYMENT_LINK);
  });

  document.getElementById("btn-refresh-status")?.addEventListener("click", async () => {
    await chrome.storage.local.remove("proCheckedAt");
    const pro = await renderPopup();
    proResult = { paid: pro };
    tryRender();
  });

  if (runDetectionBtn) {
    runDetectionBtn.addEventListener("click", () => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs?.[0];
        if (!tab?.id || !tab.url?.startsWith("https://")) {
          if (diagOutput) {
            diagOutput.hidden = false;
            diagOutput.textContent = "Open an https:// tab to run detection.";
          }
          return;
        }
        runDetectionBtn.disabled = true;
        runDetectionBtn.textContent = "Running…";
        chrome.tabs.sendMessage(tab.id, { type: "GET_DETECTION_TRACE" }, (res) => {
          runDetectionBtn.disabled = false;
          runDetectionBtn.textContent = "Run detection on current tab";
          if (diagOutput) {
            diagOutput.hidden = false;
            if (chrome.runtime.lastError || !res?.ok) {
              diagOutput.textContent =
                "Could not reach the page. Reload the tab and try again.";
              return;
            }
            diagOutput.textContent = res.trace || "No trace returned.";
          }
        });
      });
    });
  }

  function switchTab(name) {
    const isToday = name === "today";
    paneToday.hidden = !isToday;
    paneWatchlist.hidden = isToday;
    tabToday.classList.toggle("tab-btn--active", isToday);
    tabWatchlist.classList.toggle("tab-btn--active", !isToday);
    if (!isToday) renderWatchlistTab();
  }

  tabToday.addEventListener("click", () => switchTab("today"));
  tabWatchlist.addEventListener("click", () => switchTab("watchlist"));

  let proResult = null;
  let usageResult = null;
  let tabResult = null;

  function tryRender() {
    if (proResult === null || usageResult === null || tabResult === null) return;
    renderAll(proResult, usageResult, tabResult);
  }

  void renderPopup().then((pro) => {
    proResult = { paid: pro };
    tryRender();
  });

  chrome.runtime.sendMessage({ type: "GET_USAGE" }, (res) => {
    usageResult = chrome.runtime.lastError || !res
      ? { count: 0, limit: FREE_LIMIT, paid: false }
      : res;
    tryRender();
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs?.[0] || null;
    if (!tab) {
      tabResult = { tab: null, isShopify: false, domain: null };
      tryRender();
      return;
    }
    const url = tab.url || "";
    if (!url.startsWith("https://")) {
      tabResult = { tab, isShopify: false, domain: null };
      tryRender();
      return;
    }
    chrome.tabs.sendMessage(tab.id, { type: "GET_STATUS" }, (res) => {
      tabResult = { tab, ...tabStoreContext(tab, res) };
      tryRender();
    });
  });

  function renderAll(pro, usage, tabInfo) {
    const paid = isPro(pro);
    renderStatus(tabInfo, paid);

    if (paid) return;

    countEl.textContent = String(usage.count);
    const pct = Math.min((usage.count / (usage.limit || FREE_LIMIT)) * 100, 100);
    progressEl.style.width = `${pct}%`;
    progressEl.classList.toggle("at-limit", usage.count >= (usage.limit || FREE_LIMIT));
  }

  function openPanelOnTab(tab) {
    if (!tab?.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "OPEN_PANEL" }, () => {
      void chrome.runtime.lastError;
      window.close();
    });
  }

  function renderStatus({ tab, isShopify, domain }, paid) {
    statusSection.innerHTML = "";

    if (isShopify && domain) {
      const labelEl = document.createElement("p");
      labelEl.className = "status-label";
      labelEl.textContent = "Detected";

      const domainEl = document.createElement("p");
      domainEl.className = "status-domain";
      domainEl.textContent = domain;

      const openBtn = document.createElement("button");
      openBtn.className = paid ? "btn-outline" : "btn-primary";
      openBtn.textContent = "Open panel";
      openBtn.addEventListener("click", () => openPanelOnTab(tab));

      statusSection.appendChild(labelEl);
      statusSection.appendChild(domainEl);
      statusSection.appendChild(openBtn);
      return;
    }

    if (paid) return;

    const hintEl = document.createElement("p");
    hintEl.className = "status-hint";
    hintEl.textContent = tab?.url?.startsWith("https://")
      ? "Visit a Shopify store to use MakerPeek."
      : "MakerPeek works on Shopify storefronts. Navigate to a store and click the floating M button.";
    statusSection.appendChild(hintEl);
  }

  async function renderWatchlistTab() {
    const wlData = await chrome.storage.local.get(WATCHLIST_KEY);
    const wl = wlData[WATCHLIST_KEY] || { stores: [] };
    const stores = wl.stores || [];
    const countLabelEl = document.getElementById("js-watchlist-count");
    const listEl = document.getElementById("js-watchlist-list");
    if (!listEl) return;

    if (countLabelEl) countLabelEl.textContent = `Watchlist (${stores.length}/${WATCHLIST_MAX})`;

    if (stores.length === 0) {
      listEl.innerHTML =
        '<p class="watchlist-empty">Watch up to 25 stores. Get notified when they add products, change prices, or restock.</p>';
      return;
    }

    const diffKeys = stores.map((s) => `${WATCHLIST_DIFF_PREFIX}${s.domain}`);
    const diffData = await chrome.storage.local.get(diffKeys);

    const enriched = stores.map((store) => {
      const cached = diffData[`${WATCHLIST_DIFF_PREFIX}${store.domain}`] || null;
      return { store, cached };
    });

    enriched.sort((a, b) => {
      const aHas = a.cached?.summary?.length > 0;
      const bHas = b.cached?.summary?.length > 0;
      if (aHas !== bHas) return aHas ? -1 : 1;
      const aTime = a.cached?.computedAt || a.store.addedAt;
      const bTime = b.cached?.computedAt || b.store.addedAt;
      return new Date(bTime) - new Date(aTime);
    });

    listEl.innerHTML = "";
    enriched.forEach(({ store, cached }) => {
      listEl.appendChild(buildWatchlistRow(store, cached));
    });

    const alertSettingsBtn = document.getElementById("js-watchlist-alert-settings");
    const alertSettingsPanel = document.getElementById("js-alert-settings-panel");
    const alertSettingsClose = document.getElementById("js-alert-settings-close");
    if (alertSettingsBtn && alertSettingsPanel) {
      alertSettingsBtn.addEventListener("click", () => {
        alertSettingsPanel.hidden = !alertSettingsPanel.hidden;
        if (!alertSettingsPanel.hidden) renderAlertSettings(stores);
      });
    }
    if (alertSettingsClose && alertSettingsPanel) {
      alertSettingsClose.addEventListener("click", () => {
        alertSettingsPanel.hidden = true;
      });
    }
  }

  function buildWatchlistRow(store, cached) {
    const item = document.createElement("div");
    item.className = "wl-item";

    const favicon = document.createElement("img");
    favicon.className = "wl-favicon";
    favicon.src = `https://www.google.com/s2/favicons?domain=${store.domain}&sz=32`;
    favicon.width = 16;
    favicon.height = 16;
    favicon.alt = "";

    const info = document.createElement("div");
    info.className = "wl-info";

    const domainEl = document.createElement("div");
    domainEl.className = "wl-domain";
    domainEl.textContent = store.domain;

    const changeEl = document.createElement("div");
    changeEl.className = "wl-change";
    if (cached?.summary?.length > 0) {
      const ago = timeAgo(cached.computedAt);
      changeEl.textContent = `${cached.summary.join(" • ")} · ${ago}`;
      changeEl.classList.add("wl-change--active");
    } else if (store.lastPolledAt) {
      changeEl.textContent = `Checked ${timeAgo(store.lastPolledAt)} · no changes`;
    } else {
      changeEl.textContent = "Not yet checked";
    }

    info.appendChild(domainEl);
    info.appendChild(changeEl);

    const removeBtn = document.createElement("button");
    removeBtn.className = "wl-remove";
    removeBtn.title = "Remove from watchlist";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: "WATCHLIST_REMOVE", domain: store.domain }, () => {
        item.remove();
        const countEl2 = document.getElementById("js-watchlist-count");
        const remaining = document.querySelectorAll(".wl-item").length;
        if (countEl2) countEl2.textContent = `Watchlist (${remaining}/${WATCHLIST_MAX})`;
        if (remaining === 0) {
          const listEl2 = document.getElementById("js-watchlist-list");
          if (listEl2) {
            listEl2.innerHTML =
              '<p class="watchlist-empty">Watch up to 25 stores. Get notified when they add products, change prices, or restock.</p>';
          }
        }
      });
    });

    item.appendChild(favicon);
    item.appendChild(info);
    item.appendChild(removeBtn);

    item.addEventListener("click", (e) => {
      if (e.target === removeBtn) return;
      chrome.tabs.create({ url: `https://${store.domain}` });
    });

    return item;
  }

  function renderAlertSettings(stores) {
    const body = document.getElementById("js-alert-settings-body");
    if (!body || stores.length === 0) return;

    const prefs = stores[0].alertPreferences || {};
    const fields = [
      { key: "newProducts", label: "New products" },
      { key: "restocks", label: "Restocks" },
      { key: "priceDrops", label: "Price drops" },
      { key: "newSales", label: "New sales / discounts" },
      { key: "removed", label: "Removed products" },
    ];

    body.innerHTML = "";
    fields.forEach(({ key, label }) => {
      const row = document.createElement("label");
      row.className = "alert-pref-row";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = !!prefs[key];
      checkbox.addEventListener("change", () => {
        stores.forEach((store) => {
          chrome.runtime.sendMessage({
            type: "WATCHLIST_UPDATE_PREFS",
            domain: store.domain,
            prefs: { [key]: checkbox.checked },
          });
        });
      });
      const span = document.createElement("span");
      span.textContent = label;
      row.appendChild(checkbox);
      row.appendChild(span);
      body.appendChild(row);
    });

    const threshRow = document.createElement("div");
    threshRow.className = "alert-pref-row alert-pref-row--threshold";
    threshRow.innerHTML = "<span>Min price drop %</span>";
    const threshInput = document.createElement("input");
    threshInput.type = "number";
    threshInput.min = "1";
    threshInput.max = "100";
    threshInput.value = prefs.priceDropThresholdPct ?? 10;
    threshInput.className = "alert-thresh-input";
    threshInput.addEventListener("change", () => {
      const val = Math.max(1, Math.min(100, parseInt(threshInput.value, 10) || 10));
      threshInput.value = val;
      stores.forEach((store) => {
        chrome.runtime.sendMessage({
          type: "WATCHLIST_UPDATE_PREFS",
          domain: store.domain,
          prefs: { priceDropThresholdPct: val },
        });
      });
    });
    threshRow.appendChild(threshInput);
    body.appendChild(threshRow);
  }

  function timeAgo(isoString) {
    if (!isoString) return "";
    const ms = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(ms / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }
});
