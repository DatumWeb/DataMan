/**
 * Active extract (on-demand, e.g. Up Arrow / W).
 * StickMan: ~1.5s cast with charging VFX, then the extract event is logged.
 */
(function (DM) {
  const { state, bridge, util } = DM;

  const EXTRACT_DURATION_MS = 1500;

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

  function fireExtract(payload) {
    bridge.logActiveExtractEvent(payload);
  }

  DM.activeExtract = {
    EXTRACT_DURATION_MS,

    tryExtract(triggerKey) {
      const platform = state.player.currentPlatform;
      if (!platform) return;
      if (platform.elementTag === "VIEWPORT_FLOOR") return;
      if (state.extractCast.active) return;

      const el = platform.source || null;
      const textPreview = getTextPreview(el);

      const payload = {
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
      };

      if (state.visuals.skin === "stickman") {
        const now = performance.now();
        state.extractCast.active = true;
        state.extractCast.startMs = now;
        state.extractCast.endMs = now + EXTRACT_DURATION_MS;
        state.extractCast.payload = payload;
      } else {
        fireExtract(payload);
      }
    },

    tick() {
      if (!state.extractCast.active) return;
      const now = performance.now();
      if (now < state.extractCast.endMs) return;

      const payload = state.extractCast.payload;
      state.extractCast.active = false;
      state.extractCast.startMs = 0;
      state.extractCast.endMs = 0;
      state.extractCast.payload = null;

      if (payload) fireExtract(payload);
    }
  };
})(globalThis.DataMan);
