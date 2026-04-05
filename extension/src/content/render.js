(function (DM) {
  const { state, runtime, platforms, passiveLog, physics } = DM;

  function drawPlatforms() {
    const { ctx } = runtime;
    if (!ctx) return;

    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    for (const p of state.platforms) {
      if (p.elementTag === "VIEWPORT_FLOOR") continue;
      ctx.strokeRect(p.x, p.y, p.w, p.h);
    }
    ctx.restore();
  }

  function drawPlayer(tSec) {
    const skin = state.visuals.skin;
    if (DM.skins?.draw) {
      DM.skins.draw(skin, tSec);
      return;
    }
  }

  function drawHud() {
    const { ctx } = runtime;
    if (!ctx) return;
    ctx.save();
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.fillRect(8, 8, 460, 28);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px monospace";
    ctx.fillText("DataMan: ←/→ or A/D move · Space jump · S or ↓ drop through", 14, 26);
    ctx.restore();
  }

  function gameLoop(now) {
    const { canvas, ctx } = runtime;
    if (!state.running || !ctx || !canvas) return;

    const t = now ?? performance.now();
    const tSec = t / 1000;

    const dt = state.lastFrameMs ? t - state.lastFrameMs : 16.67;
    state.lastFrameMs = t;
    state.frameDeltaMs = Math.min(Math.max(dt, 1), 200);

    if (t - state.lastPlatformRefresh > 750) {
      platforms.refresh();
      state.lastPlatformRefresh = t;
    }

    passiveLog.maybeRegisterDomainVisit();
    physics.update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlatforms();
    drawPlayer(tSec);
    if (DM.screenshot?.drawSelection) {
      DM.screenshot.drawSelection();
    }
    drawHud();

    runtime.rafId = requestAnimationFrame(gameLoop);
  }

  DM.render = {
    gameLoop,
    startLoop() {
      if (runtime.rafId) cancelAnimationFrame(runtime.rafId);
      state.lastPlatformRefresh = performance.now();
      runtime.rafId = requestAnimationFrame(gameLoop);
    }
  };
})(globalThis.DataMan);
