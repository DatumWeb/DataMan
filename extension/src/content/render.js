(function (DM) {
  const { state, runtime, platforms, physics, passiveLog } = DM;

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

  function drawPlayer() {
    const { player } = state;
    const { ctx } = runtime;
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = state.visuals.color;

    const skin = state.visuals.skin;
    if (skin === "circle") {
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (skin === "triangle") {
      ctx.beginPath();
      ctx.moveTo(player.x + player.w / 2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h);
      ctx.lineTo(player.x, player.y + player.h);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillRect(player.x, player.y, player.w, player.h);
    }

    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    if (skin === "circle") {
      ctx.beginPath();
      ctx.arc(player.x + player.w / 2, player.y + player.h / 2, player.w / 2, 0, Math.PI * 2);
      ctx.stroke();
    } else if (skin === "triangle") {
      ctx.beginPath();
      ctx.moveTo(player.x + player.w / 2, player.y);
      ctx.lineTo(player.x + player.w, player.y + player.h);
      ctx.lineTo(player.x, player.y + player.h);
      ctx.closePath();
      ctx.stroke();
    } else {
      ctx.strokeRect(player.x + 0.5, player.y + 0.5, player.w - 1, player.h - 1);
    }

    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.font = "10px monospace";
    ctx.fillText("DM", player.x + 5, player.y + 16);
    ctx.restore();
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
    if (t - state.lastPlatformRefresh > 750) {
      platforms.refresh();
      state.lastPlatformRefresh = t;
    }

    passiveLog.maybeRegisterDomainVisit();

    physics.update();

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawPlatforms();
    drawPlayer();
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
