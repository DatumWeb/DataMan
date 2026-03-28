/* DataMan — runs in each page */

console.log("[DataMan] content script loaded on", location.hostname);

(async () => {
  try {
    const res = await browser.runtime.sendMessage({
      type: "CS_HELLO",
      domain: location.hostname,
      pageUrl: location.href
    });
    console.log("[DataMan] background replied (CS_HELLO)", res);
  } catch (e) {
    console.warn("[DataMan] CS_HELLO failed", e);
  }
})();
