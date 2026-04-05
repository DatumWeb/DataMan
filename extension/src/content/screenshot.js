/**
 * AstroMan's screenshot ability.
 * Space press  → drop corner at current player position.
 * Space held   → drag opposite corner with player; draw selection rectangle.
 * Space release → capture visible tab, crop to selection, store.
 */
(function (DM) {
  const { state, runtime } = DM;

  function playerCenter() {
    const p = state.player;
    return { x: p.x + p.w / 2, y: p.y + p.h / 2 };
  }

  function selectionRect() {
    const ss = state.screenshot;
    const cur = playerCenter();
    const x = Math.min(ss.startX, cur.x);
    const y = Math.min(ss.startY, cur.y);
    const w = Math.abs(cur.x - ss.startX);
    const h = Math.abs(cur.y - ss.startY);
    return { x, y, w, h };
  }

  DM.screenshot = {
    beginSelection() {
      const c = playerCenter();
      state.screenshot.selecting = true;
      state.screenshot.startX = c.x;
      state.screenshot.startY = c.y;
    },

    isSelecting() {
      return state.screenshot.selecting;
    },

    async finishSelection() {
      if (!state.screenshot.selecting) return;
      state.screenshot.selecting = false;

      const rect = selectionRect();
      if (rect.w < 8 || rect.h < 8) {
        console.log("[DataMan] Screenshot selection too small, skipped.");
        return;
      }

      try {
        const res = await browser.runtime.sendMessage({
          type: "CAPTURE_SCREENSHOT",
          rect: {
            x: Math.round(rect.x),
            y: Math.round(rect.y),
            w: Math.round(rect.w),
            h: Math.round(rect.h)
          },
          domain: location.hostname,
          pageUrl: location.href,
          devicePixelRatio: window.devicePixelRatio || 1
        });
        if (res?.ok) {
          console.log("[DataMan] Screenshot saved!", res.screenshotId);
        } else {
          console.warn("[DataMan] Screenshot failed", res?.error);
        }
      } catch (e) {
        console.warn("[DataMan] Screenshot capture error", e);
      }
    },

    drawSelection() {
      if (!state.screenshot.selecting) return;
      const { ctx } = runtime;
      if (!ctx) return;

      const r = selectionRect();

      ctx.save();

      ctx.fillStyle = "rgba(167, 139, 250, 0.12)";
      ctx.fillRect(r.x, r.y, r.w, r.h);

      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = "rgba(167, 139, 250, 0.8)";
      ctx.lineWidth = 2;
      ctx.strokeRect(r.x, r.y, r.w, r.h);

      ctx.setLineDash([]);
      const cornerSize = 8;
      ctx.fillStyle = "#a78bfa";
      ctx.fillRect(state.screenshot.startX - cornerSize / 2, state.screenshot.startY - cornerSize / 2, cornerSize, cornerSize);
      const cur = playerCenter();
      ctx.fillRect(cur.x - cornerSize / 2, cur.y - cornerSize / 2, cornerSize, cornerSize);

      ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
      ctx.fillRect(r.x, r.y - 20, 120, 18);
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "11px monospace";
      ctx.fillText(`${Math.round(r.w)} × ${Math.round(r.h)}`, r.x + 4, r.y - 6);

      ctx.restore();
    }
  };
})(globalThis.DataMan);
