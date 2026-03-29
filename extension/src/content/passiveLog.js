/**
 * Passive telemetry: jumps and domain visits are logged as events.
 * Distance updates stats only (ADD_DISTANCE_PX) so the event list is not flooded.
 */
(function (DM) {
  const { state } = DM;

  function pageDomain() {
    try {
      return location.hostname || "";
    } catch {
      return "";
    }
  }

  function pageUrl() {
    try {
      return location.href;
    } catch {
      return "";
    }
  }

  DM.passiveLog = {
    onJump(platform) {
      if (!platform || platform.elementTag === "VIEWPORT_FLOOR") return;
      DM.bridge.logPassiveEvent({
        eventType: "jump",
        domain: pageDomain(),
        pageUrl: pageUrl(),
        elementTag: platform.elementTag || null,
        selectorGuess: platform.selector || null,
        bbox: {
          x: Math.round(platform.x),
          y: Math.round(platform.y),
          w: Math.round(platform.w),
          h: Math.round(platform.h)
        }
      });
    },

    recordTravel(deltaX) {
      const dx = Math.abs(deltaX);
      if (dx <= 0) return;
      const meta = state.passiveLogMeta;
      meta.distanceBuffer = (meta.distanceBuffer || 0) + dx;
      if (meta.distanceBuffer < 25) return;
      const flush = Math.floor(meta.distanceBuffer);
      meta.distanceBuffer -= flush;
      DM.bridge.addDistancePx(flush);
    },

    /** Call from the game loop — one passive `domain_visit` per host per page load. */
    maybeRegisterDomainVisit() {
      const host = pageDomain();
      if (!host) return;
      const meta = state.passiveLogMeta;
      if (meta.domainVisitSentFor === host) return;
      meta.domainVisitSentFor = host;
      DM.bridge.logPassiveEvent({
        eventType: "domain_visit",
        domain: host,
        pageUrl: pageUrl()
      });
    }
  };
})(globalThis.DataMan);
