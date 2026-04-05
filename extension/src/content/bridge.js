/**
 * Talks to the background script (browser.storage lives there).
 * Physics and visuals always come from the local character registry
 * (DM.characters) — never from stored data.
 */
(function (DM) {
  DM.bridge = {
    async syncCharacterFromBackground() {
      try {
        const res = await browser.runtime.sendMessage({ type: "GET_STATE" });
        if (!res?.ok || !res.state) return;
        const id = res.state.activeCharacterId;
        DM.characters.applyToState(id);
      } catch {
        /* keep defaults */
      }
    },

    async handshake() {
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
    },

    logPassiveEvent(payload) {
      browser.runtime
        .sendMessage({
          type: "LOG_PASSIVE_EVENT",
          ...payload
        })
        .catch(() => {});
    },

    addDistancePx(deltaPx) {
      browser.runtime
        .sendMessage({
          type: "ADD_DISTANCE_PX",
          deltaPx
        })
        .catch(() => {});
    },

    logActiveExtractEvent(payload) {
      browser.runtime
        .sendMessage({
          type: "LOG_ACTIVE_EXTRACT_EVENT",
          ...payload
        })
        .catch(() => {});
    }
  };
})(globalThis.DataMan);
