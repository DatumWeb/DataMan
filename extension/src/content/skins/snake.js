(function (DM) {
  const { state, runtime } = DM;

  function drawSnake() {
    const { ctx } = runtime;
    if (!ctx) return;

    const sn = state.snake;
    const cellSize = state.physics.snakeCellSize || 14;

    ctx.save();

    for (let i = sn.segments.length - 1; i >= 0; i--) {
      const seg = sn.segments[i];
      const isHead = i === 0;

      if (isHead) {
        ctx.fillStyle = "#15803d";
      } else {
        const t = i / Math.max(1, sn.segments.length - 1);
        const r = Math.round(34 + t * 20);
        const g = Math.round(197 - t * 40);
        const b = Math.round(94 - t * 30);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
      }

      const inset = isHead ? 0 : 1;
      ctx.fillRect(seg.x + inset, seg.y + inset, cellSize - inset * 2, cellSize - inset * 2);

      if (isHead) {
        ctx.fillStyle = "#ffffff";
        const eyeSize = Math.max(2, cellSize * 0.18);
        const cx = seg.x + cellSize / 2;
        const cy = seg.y + cellSize / 2;
        let ex1, ey1, ex2, ey2;
        const off = cellSize * 0.2;

        if (sn.direction === "right") {
          ex1 = cx + off; ey1 = cy - off;
          ex2 = cx + off; ey2 = cy + off;
        } else if (sn.direction === "left") {
          ex1 = cx - off; ey1 = cy - off;
          ex2 = cx - off; ey2 = cy + off;
        } else if (sn.direction === "up") {
          ex1 = cx - off; ey1 = cy - off;
          ex2 = cx + off; ey2 = cy - off;
        } else {
          ex1 = cx - off; ey1 = cy + off;
          ex2 = cx + off; ey2 = cy + off;
        }
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const bankSize = Array.isArray(sn.eatenBank) ? sn.eatenBank.length : 0;
    ctx.fillStyle = "rgba(15, 23, 42, 0.72)";
    ctx.fillRect(8, 40, 280, 22);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      `Eaten: ${sn.lettersEaten}  Bank: ${bankSize}  Words: ${sn.wordsCreated}`,
      14, 51
    );

    const spitMsg = DM.snakeSpit?.currentMessage();
    if (spitMsg && sn.segments.length > 0) {
      const head = sn.segments[0];
      const progress = DM.snakeSpit.displayProgress();
      const alpha = Math.max(0, 1 - progress * 1.2);
      const rise = progress * 30;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 35px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      const textY = head.y - 8 - rise;
      ctx.fillStyle = "#0f172a";
      ctx.fillText(spitMsg, head.x + cellSize / 2 + 1, textY + 1);
      ctx.fillStyle = "#bbf7d0";
      ctx.fillText(spitMsg, head.x + cellSize / 2, textY);
      ctx.restore();
    }

    if (!sn.alive) {
      ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
      ctx.fillRect(0, 0, runtime.canvas.width, runtime.canvas.height);
      ctx.fillStyle = "#f8fafc";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = runtime.canvas.width / 2;
      const cy = runtime.canvas.height / 2;
      ctx.fillText("Game Over!", cx, cy - 20);
      ctx.font = "16px system-ui, sans-serif";
      ctx.fillText(`Letters eaten: ${sn.lettersEaten}  ·  Length: ${sn.segments.length}`, cx, cy + 14);
      ctx.fillText("Press Space to restart", cx, cy + 40);
    }

    ctx.restore();
  }

  DM.skins = DM.skins || {};
  DM.skins.snake = {
    draw() {
      drawSnake();
    }
  };
})(globalThis.DataMan);
