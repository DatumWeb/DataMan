/* DataMan — background service worker (shell) */

browser.runtime.onInstalled.addListener(() => {
  console.log("[DataMan] extension installed or updated");
});

browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "PING") {
    sendResponse({ ok: true, from: "background" });
    return true;
  }
  return undefined;
});
