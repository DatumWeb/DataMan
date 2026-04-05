(function (DM) {
  DM.bootstrap = async function bootstrap() {
    console.log("[DataMan] content script loaded on", location.hostname);

    DM.characters.applyToState(DM.characters.ids()[0]);

    DM.overlay.install();
    DM.input.wire();
    DM.physics.spawnPlayerTopCenter();
    DM.platforms.refresh();

    if (DM.skins.stickman?.preload) {
      void DM.skins.stickman.preload();
    }

    await DM.bridge.syncCharacterFromBackground();
    DM.render.startLoop();

    // If the popup switches `activeCharacterId`, resync visuals/physics live.
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
  };

  DM.bootstrap();
})(globalThis.DataMan);
