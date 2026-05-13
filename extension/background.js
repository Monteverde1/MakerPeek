// MakerPeek — Background Service Worker (MV3)
// TODO: forward store URL to backend API (/api/enrich/products),
//       stream result back to the content script via chrome.tabs.sendMessage.

chrome.runtime.onMessage.addListener((message, sender, _sendResponse) => {
  console.log("[MakerPeek background] received message:", message, "from tab:", sender.tab?.id);

  // TODO: call fetch(`${process.env.APP_URL}/api/enrich/products`, { method: "POST", ... })
  //       and relay the response to the originating tab.
});
