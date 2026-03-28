/**
 * Talks to the background script (browser.storage lives there).
 * Page world never touches storage APIs for extension data directly.
 */
(function (DM) {
  const { state } = DM;

  DM.bridge = {
    async syncCharacterFromBackground() {
      try {
        const res = await browser.runtime.sendMessage({ type: "GET_STATE" });
        if (!res?.ok || !res.state) return;
        const id = res.state.activeCharacterId;
        const ch = res.state.characters?.[id];
        if (!ch) return;
        if (typeof ch.skin === "string") state.visuals.skin = ch.skin;
        if (typeof ch.colorHex === "string") state.visuals.color = ch.colorHex;
        const g = Number(ch.physics?.gravity ?? ch.gravity);
        const j = Number(ch.physics?.jumpStrength ?? ch.jumpStrength);
        const m = Number(ch.physics?.moveSpeed ?? ch.moveSpeed);
        if (!Number.isNaN(g)) state.physics.gravity = g;
        if (!Number.isNaN(j)) state.physics.jumpStrength = j;
        if (!Number.isNaN(m)) state.physics.moveSpeed = m;
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
    }
  };
})(globalThis.DataMan);
