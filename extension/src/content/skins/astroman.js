(function (DM) {
  const { state, runtime } = DM;

  function drawSpeedHud() {
    if (state.physics.physicsMode !== "space") return;
    const { ctx } = runtime;
    const canvas = runtime.canvas;
    if (!ctx || !canvas) return;

    const spd = Math.round(state.player.spaceSpeedPxPerSec || 0);
    const text = `${spd} px/s`;

    ctx.save();
    ctx.font = "12px ui-monospace, monospace";
    const metrics = ctx.measureText(text);
    const padX = 12;
    const padY = 10;
    const boxW = metrics.width + 16;
    const boxH = 22;
    const x = canvas.width - boxW - padX;
    const y = canvas.height - boxH - padY;

    ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
    ctx.fillRect(x, y, boxW, boxH);

    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 8, y + boxH / 2);
    ctx.restore();
  }

  const FRAME_W = 192;
  const FRAME_H = 221;
  const TOTAL_FRAMES = 8;
  const THRUST_LOOP_START = 1;
  const THRUST_LOOP_END = 6;
  const THRUST_IGNITE_FRAME = 0;
  const IDLE_FRAME = 7;
  const THRUST_LOOP_FPS = 10;

  const ASSET = "assets/AstroMan/ezgif.com-gif-to-sprite-converter.png";

  let imgBitmap = null;
  let loadPromise = null;

  function assetUrl() {
    return browser.runtime.getURL(ASSET);
  }

  function loadSheet() {
    if (loadPromise) return loadPromise;
    loadPromise = fetch(assetUrl())
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.blob();
      })
      .then((blob) => createImageBitmap(blob))
      .then((bmp) => {
        imgBitmap = bmp;
        return bmp;
      })
      .catch((err) => {
        console.warn("[DataMan] AstroMan sprite load failed", err);
        loadPromise = null;
      });
    return loadPromise;
  }

  function pickFrame(tSec) {
    const { player } = state;
    if (!player.thrusting) return IDLE_FRAME;

    const thrustElapsed = (performance.now() - player.thrustStartT) / 1000;
    if (thrustElapsed < 0.12) return THRUST_IGNITE_FRAME;

    const loopLen = THRUST_LOOP_END - THRUST_LOOP_START + 1;
    const idx = Math.floor(tSec * THRUST_LOOP_FPS) % loopLen;
    return THRUST_LOOP_START + idx;
  }

  function drawAstroman(tSec) {
    const { player } = state;
    const { ctx } = runtime;
    if (!ctx) return;

    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const scale = 2.2;
    const destSize = Math.max(player.w, player.h) * scale;

    if (!imgBitmap) {
      loadSheet();
      ctx.save();
      ctx.fillStyle = state.visuals.color || "#a78bfa";
      ctx.beginPath();
      ctx.arc(cx, cy, destSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      drawSpeedHud();
      return;
    }

    const frame = pickFrame(tSec);
    const sx = frame * FRAME_W;
    const half = destSize / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(cx, cy);
    ctx.rotate(player.angle + Math.PI / 2);
    ctx.drawImage(imgBitmap, sx, 0, FRAME_W, FRAME_H, -half, -half, destSize, destSize);
    ctx.restore();

    drawSpeedHud();
  }

  DM.skins = DM.skins || {};
  DM.skins.astroman = {
    draw(tSec) {
      drawAstroman(tSec ?? 0);
    },
    preload() {
      return loadSheet();
    }
  };
})(globalThis.DataMan);
