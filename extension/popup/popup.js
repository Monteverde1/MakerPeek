// MakerPeek Popup
// TODO: handle sign-in flow via magic link, show user plan + remaining lookups.

console.log("[MakerPeek] popup opened");

document.addEventListener("DOMContentLoaded", function () {
  const signInBtn = document.getElementById("sign-in-btn");
  const usedEl = document.getElementById("used");
  const statusDot = document.getElementById("status-dot");

  // TODO: fetch rate-limit status from backend /api/rate-limit
  //       fetch("https://makerpeek.com/api/rate-limit")
  //         .then(r => r.json())
  //         .then(data => { usedEl.textContent = data.used_today; })
  //         .catch(() => { usedEl.textContent = "?"; });

  // Placeholder usage count
  usedEl.textContent = "—";

  // TODO: check chrome.storage for active session, show plan info
  chrome.storage.local.get(["session"], function (result) {
    if (result.session) {
      signInBtn.textContent = "Open dashboard";
      statusDot.classList.add("active");
    }
  });

  signInBtn.addEventListener("click", function () {
    // TODO: open sign-in tab or dashboard tab
    chrome.tabs.create({ url: "https://makerpeek.com" });
  });
});
