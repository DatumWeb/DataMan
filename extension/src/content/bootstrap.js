(function (DM) {
  DM.bootstrap = async function bootstrap() {
    console.log("[DataMan] content script loaded on", location.hostname);

    DM.overlay.install();
    DM.input.wire();
    DM.physics.spawnPlayerTopCenter();
    DM.platforms.refresh();

    await DM.bridge.syncCharacterFromBackground();
    DM.render.startLoop();

    await DM.bridge.handshake();
  };

  DM.bootstrap();
})(globalThis.DataMan);
