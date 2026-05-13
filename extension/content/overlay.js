// MakerPeek — Overlay Content Script
// Listens for the Shopify-detected event and injects a fixed-position panel.

document.addEventListener("makerpeek:shopify-detected", function (event) {
  const { storeUrl } = event.detail;

  // Avoid injecting twice
  if (document.getElementById("makerpeek-overlay")) return;

  const panel = document.createElement("div");
  panel.id = "makerpeek-overlay";
  panel.style.cssText = [
    "position: fixed",
    "bottom: 20px",
    "right: 20px",
    "z-index: 2147483647",
    "background: #FBF7F2",
    "border: 1.5px solid #3D5944",
    "border-radius: 12px",
    "padding: 14px 18px",
    "box-shadow: 0 4px 24px rgba(0,0,0,0.12)",
    "font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
    "font-size: 13px",
    "color: #1a1a1a",
    "max-width: 260px",
    "display: flex",
    "flex-direction: column",
    "gap: 10px",
  ].join(";");

  const label = document.createElement("p");
  label.style.cssText = "margin: 0; font-weight: 600; color: #3D5944;";
  label.textContent = "MakerPeek loaded — Shopify store detected";

  const button = document.createElement("button");
  button.style.cssText = [
    "background: #3D5944",
    "color: #FBF7F2",
    "border: none",
    "border-radius: 8px",
    "padding: 7px 14px",
    "font-size: 12px",
    "font-weight: 600",
    "cursor: pointer",
    "align-self: flex-start",
  ].join(";");
  button.textContent = "Open analysis";

  button.addEventListener("click", function () {
    // TODO: open a full analysis panel or side-drawer instead of just messaging background
    chrome.runtime.sendMessage({ type: "ANALYZE_STORE", storeUrl });
  });

  const close = document.createElement("button");
  close.style.cssText = [
    "position: absolute",
    "top: 8px",
    "right: 10px",
    "background: none",
    "border: none",
    "font-size: 16px",
    "cursor: pointer",
    "color: #999",
    "line-height: 1",
  ].join(";");
  close.textContent = "×";
  close.setAttribute("aria-label", "Dismiss");
  close.addEventListener("click", function () {
    panel.remove();
  });

  panel.style.position = "fixed"; // ensure position: fixed sticks after relative set above
  panel.appendChild(close);
  panel.appendChild(label);
  panel.appendChild(button);
  document.body.appendChild(panel);
});
