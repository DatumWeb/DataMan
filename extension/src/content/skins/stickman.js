(function (DM) {
  const { state, runtime } = DM;

  const FRAME_W = 64;
  const FRAME_H = 64;

  /** Paths are relative to the extension root (see `browser.runtime.getURL`). */
  const ASSETS = {
    idle: "assets/StickmanPack/Idle/thickIdleSheet.png",
    run: "assets/StickmanPack/Run/thickRunSheet.png",
    punch: "assets/StickmanPack/Punch/thickPunchSheet.png",
    extractCharge: "assets/StickmanPack/chargingUpYellow.png"
  };

  const SHEETS = {
    idle: { frames: 6, fps: 7 },
    run: { frames: 9, fps: 10 },
    punch: { frames: 10, fps: 12 },
    /** 960×768 → 5×4 grid of 192×192 frames */
    extractCharge: { frameW: 192, frameH: 192, frames: 20 }
  };

  const EXTRACT_AURA_SCALE = 2.85;

  const imgCache = new Map();
  let preloadPromise = null;

  function assetUrl(relativePath) {
    return browser.runtime.getURL(relativePath);
  }

  /**
   * Content scripts often fail to decode extension PNGs via `new Image()` + moz-extension URLs.
   * `fetch` + `createImageBitmap` runs in the extension context and works reliably on Firefox.
   */
  function loadImage(relativePath) {
    const url = assetUrl(relativePath);
    if (imgCache.has(url)) {
      return Promise.resolve(imgCache.get(url));
    }
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status} ${relativePath}`);
        return r.blob();
      })
      .then((blob) => createImageBitmap(blob))
      .then((bitmap) => {
        imgCache.set(url, bitmap);
        return bitmap;
      });
  }

  function ensureSpritesLoaded() {
    if (!preloadPromise) {
      loadImage(ASSETS.extractCharge).catch((err) => {
        console.warn("[DataMan] extractCharge sprite load failed (non-blocking)", err);
      });
      preloadPromise = Promise.all([
        loadImage(ASSETS.idle),
        loadImage(ASSETS.run),
        loadImage(ASSETS.punch)
      ])
        .then(() => true)
        .catch((err) => {
          preloadPromise = null;
          throw err;
        });
    }
    return preloadPromise;
  }

  function computePose() {
    const player = state.player;
    const vx = Number(player.vx || 0);
    const vy = Number(player.vy || 0);
    const speed = Math.abs(vx);
    const moving = speed > 0.15;
    const sprint =
      moving && (state.keys?.has("ShiftLeft") || state.keys?.has("ShiftRight"));

    if (!player.onGround) {
      return vy < 0 ? "jump" : "fall";
    }
    if (!moving) return "idle";
    return sprint ? "sprint" : "walk";
  }

  function drawSheetFrame(
    ctx,
    img,
    frameIndex,
    fw,
    fh,
    destCx,
    destCy,
    destSize,
    flipX,
    alpha
  ) {
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const cols = Math.max(1, Math.floor(iw / fw));
    const rows = Math.max(1, Math.floor(ih / fh));
    const total = cols * rows;
    const idx = Math.max(0, Math.min(frameIndex, total - 1));
    const sx = (idx % cols) * fw;
    const sy = Math.floor(idx / cols) * fh;
    const half = destSize / 2;

    ctx.save();
    ctx.globalAlpha = alpha != null ? alpha : 1;
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(destCx, destCy);
      ctx.scale(-1, 1);
      ctx.translate(-destCx, -destCy);
    }
    ctx.drawImage(img, sx, sy, fw, fh, destCx - half, destCy - half, destSize, destSize);
    ctx.restore();
  }

  function drawFrame(ctx, img, frameIndex, destCx, destCy, destSize, flipX) {
    const fw = FRAME_W;
    const fh = FRAME_H;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const cols = Math.max(1, Math.floor(iw / fw));
    const idx = Math.max(0, Math.min(frameIndex, cols * Math.floor(ih / fh) - 1));
    const sx = (idx % cols) * fw;
    const sy = Math.floor(idx / cols) * fh;
    const half = destSize / 2;

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (flipX) {
      ctx.translate(destCx, destCy);
      ctx.scale(-1, 1);
      ctx.translate(-destCx, -destCy);
    }
    ctx.drawImage(img, sx, sy, fw, fh, destCx - half, destCy - half, destSize, destSize);
    ctx.restore();
  }

  function drawFallbackGlow(ctx, cx, cy, destSize, progress) {
    ctx.save();
    const radius = destSize * (0.6 + progress * 0.8);
    const alpha = 0.25 + progress * 0.45;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(250, 204, 21, ${alpha})`);
    grad.addColorStop(0.6, `rgba(250, 204, 21, ${alpha * 0.4})`);
    grad.addColorStop(1, "rgba(250, 204, 21, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawExtractChargeAura(ctx, cx, cy, destSize, dir) {
    const ec = state.extractCast;
    if (!ec?.active || state.visuals.skin !== "stickman") return;

    const dur = DM.activeExtract?.EXTRACT_DURATION_MS ?? 1500;
    const elapsed = performance.now() - ec.startMs;
    const progress = Math.min(1, Math.max(0, elapsed / dur));

    const url = assetUrl(ASSETS.extractCharge);
    const img = imgCache.get(url);
    if (!img) {
      loadImage(ASSETS.extractCharge).catch(() => {});
      const glowAuraSize = destSize * EXTRACT_AURA_SCALE;
      const glowCy = cy - (glowAuraSize - destSize) / 2;
      drawFallbackGlow(ctx, cx, glowCy, destSize, progress);
      return;
    }

    const sheet = SHEETS.extractCharge;
    const frame = Math.min(
      sheet.frames - 1,
      Math.floor(progress * sheet.frames)
    );

    const auraSize = destSize * EXTRACT_AURA_SCALE;
    const auraCy = cy - (auraSize - destSize) / 2;
    drawSheetFrame(
      ctx,
      img,
      frame,
      sheet.frameW,
      sheet.frameH,
      cx,
      auraCy,
      auraSize,
      dir < 0,
      0.92
    );
  }

  /** Minimal placeholder while PNGs load (same hitbox as final art). */
  function drawPlaceholder(ctx, cx, cy, size, color) {
    const half = size * 0.35;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(cx - half, cy - half, half * 2, half * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function drawStickman(tSec) {
    const { player } = state;
    const { ctx } = runtime;
    if (!ctx) return;

    const pose = computePose();
    const vx = Number(player.vx || 0);
    const dir = vx === 0 ? 1 : vx > 0 ? 1 : -1;
    const visuals = state.visuals;
    const color = visuals.color || "#111827";

    const scale = 2;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const destSize = Math.max(player.w, player.h) * scale;

    drawExtractChargeAura(ctx, cx, cy, destSize, dir);

    if (!imgCache.has(assetUrl(ASSETS.idle))) {
      ensureSpritesLoaded().catch((err) => {
        console.warn("[DataMan] StickMan sprite load failed", err);
      });
      drawPlaceholder(ctx, cx, cy, destSize, color);
      return;
    }

    const idleImg = imgCache.get(assetUrl(ASSETS.idle));
    const runImg = imgCache.get(assetUrl(ASSETS.run));

    let img = idleImg;
    let frame = 0;
    let fps = SHEETS.idle.fps;
    let maxFrames = SHEETS.idle.frames;

    if (pose === "walk") {
      img = runImg;
      maxFrames = SHEETS.run.frames;
      fps = 9;
    } else if (pose === "sprint") {
      img = runImg;
      maxFrames = SHEETS.run.frames;
      fps = 15;
    } else if (pose === "jump") {
      img = idleImg;
      maxFrames = SHEETS.idle.frames;
      frame = 0;
      fps = 0;
    } else if (pose === "fall") {
      img = runImg;
      maxFrames = SHEETS.run.frames;
      frame = Math.min(4, maxFrames - 1);
      fps = 0;
    } else {
      img = idleImg;
      maxFrames = SHEETS.idle.frames;
      fps = SHEETS.idle.fps;
    }

    if (fps > 0) {
      frame = Math.floor(tSec * fps) % maxFrames;
    }

    drawFrame(ctx, img, frame, cx, cy, destSize, dir < 0);
  }

  DM.skins = DM.skins || {};
  DM.skins.stickman = {
    draw(tSec) {
      drawStickman(tSec ?? 0);
    },
    /** Lets bootstrap warm images before first paint (optional). */
    preload() {
      return ensureSpritesLoaded();
    }
  };
})(globalThis.DataMan);
