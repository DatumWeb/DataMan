/**
 * Active extract (on-demand, e.g. Up Arrow / W).
 *
 * TODO (later): add a short "cast time" (~1s) + animation before sending the extract event.
 * For now: immediate extract logging.
 */
(function (DM) {
  const { state, bridge, util } = DM;

  function pageDomain() {
    try {
      return location.hostname || "";
    } catch {
      return "";
    }
  }

  function pageUrl() {
    try {
      return location.href || "";
    } catch {
      return "";
    }
  }

  function getTextPreview(el) {
    if (!el) return "";
    const raw = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
    return raw.slice(0, 220);
  }

  DM.activeExtract = {
    /**
     * Attempts to extract from the platform the player is currently standing on.
     * @param {string} triggerKey
     */
    tryExtract(triggerKey) {
      const platform = state.player.currentPlatform;
      if (!platform) return;
      if (platform.elementTag === "VIEWPORT_FLOOR") return;

      const el = platform.source || null;
      const textPreview = getTextPreview(el);

      bridge.logActiveExtractEvent({
        domain: pageDomain(),
        pageUrl: pageUrl(),
        elementTag: platform.elementTag || "UNKNOWN",
        selectorGuess: platform.selector || util.bestSelectorForElement(el),
        bbox: {
          x: Math.round(platform.x),
          y: Math.round(platform.y),
          w: Math.round(platform.w),
          h: Math.round(platform.h)
        },
        textPreview: textPreview || null,
        extra: {
          triggerKey: triggerKey || null,
          hasSource: !!el,
          textLen: textPreview ? textPreview.length : 0
        }
      });
    }
  };
})(globalThis.DataMan);

