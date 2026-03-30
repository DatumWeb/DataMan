(function (DM) {
  const { state, runtime } = DM;

  DM.skins.basic = {
    draw(_tSec) {
      const { ctx } = runtime;
      if (!ctx) return;

      const { player } = state;
      ctx.save();
      ctx.fillStyle = state.visuals.color;

      const skin = state.visuals.skin;

      // Fill shape
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
        // default: square
        ctx.fillRect(player.x, player.y, player.w, player.h);
      }

      // Outline
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

      // Label (for non-stickman skins)
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.font = "10px monospace";
      ctx.fillText("DM", player.x + 5, player.y + 16);

      ctx.restore();
    }
  };
})(globalThis.DataMan);

