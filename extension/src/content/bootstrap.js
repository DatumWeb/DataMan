(function (DM) {
  async function syncWithRetry(maxAttempts) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const res = await browser.runtime.sendMessage({ type: "GET_STATE" });
        if (res?.ok && res.state?.activeCharacterId) {
          DM.characters.applyToState(res.state.activeCharacterId);
          return true;
        }
      } catch { /* background not ready yet */ }
      if (i < maxAttempts - 1) {
        await new Promise((r) => setTimeout(r, 300 * (i + 1)));
      }
    }
    return false;
  }

  function ensureOverlayAlive() {
    const overlayId = DM.config?.OVERLAY_ID || "dataman-overlay-root";
    const existing = document.getElementById(overlayId);
    if (!existing || !DM.runtime.ctx) {
      console.log("[DataMan] overlay missing, reinstalling…");
      DM.runtime.canvas = null;
      DM.runtime.ctx = null;
      DM.overlay.install();
      if (!DM.runtime.ctx) return false;
    }
    return true;
  }

  let watchdogId = 0;
  function startWatchdog() {
    if (watchdogId) clearInterval(watchdogId);
    watchdogId = setInterval(() => {
      if (!DM.runtime.ctx || !DM.runtime.canvas) {
        if (ensureOverlayAlive()) {
          DM.render.startLoop();
        }
      }
    }, 2000);
  }

  DM.bootstrap = async function bootstrap() {
    console.log("[DataMan] content script loaded on", location.hostname);

    try {
      DM.characters.applyToState(DM.characters.ids()[0]);

      DM.overlay.install();
      DM.input.wire();
      DM.physics.spawnPlayerTopCenter();
      DM.platforms.refresh();

      if (DM.skins.stickman?.preload) {
        void DM.skins.stickman.preload();
      }
      if (DM.skins.astroman?.preload) {
        void DM.skins.astroman.preload();
      }

      await syncWithRetry(5);
      DM.render.startLoop();
      startWatchdog();

      if (!DM.bootstrap._wiredStorageListener) {
        DM.bootstrap._wiredStorageListener = true;
        const STORAGE_KEY = "datamanState";
        browser.storage.onChanged.addListener(async (_changes, areaName) => {
          if (areaName !== "local") return;
          if (!_changes || !_changes[STORAGE_KEY]) return;
          await DM.bridge.syncCharacterFromBackground();
        });
      }

      await DM.bridge.handshake();
    } catch (err) {
      console.error("[DataMan] bootstrap failed, retrying in 2s…", err);
      setTimeout(() => DM.bootstrap(), 2000);
    }
  };

  DM.bootstrap();
})(globalThis.DataMan);
