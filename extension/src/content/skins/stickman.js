(function (DM) {
  const { state, runtime } = DM;

  function clamp01(n) {
    return Math.max(0, Math.min(1, n));
  }

  function computePose(tSec) {
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

  function drawStickman(tSec) {
    const { player } = state;
    const { ctx } = runtime;
    if (!ctx) return;

    const pose = computePose(tSec);

    const vx = Number(player.vx || 0);
    const vy = Number(player.vy || 0);
    const dir = vx === 0 ? 1 : vx > 0 ? 1 : -1;

    const visuals = state.visuals;
    const color = visuals.color;
    const outline = "rgba(0,0,0,0.35)";

    // Visual scale (collision box stays the same; art scales up).
    const scale = 2;
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    const stickW = player.w * scale;
    const stickH = player.h * scale;
    const left = cx - stickW / 2;
    const top = cy - stickH / 2;

    const jumpT = !player.onGround
      ? Math.min(1, Math.max(0, Math.abs(vy) / 12))
      : 0;

    const bobIdle = Math.sin(tSec * 2.2) * stickH * 0.016;
    const bobMove =
      (pose === "walk" || pose === "sprint") && player.onGround
        ? Math.sin(tSec * (pose === "sprint" ? 12 : 9)) * stickH * 0.03
        : 0;
    const bob = bobIdle + bobMove;

    const headR = Math.max(7, stickW * 0.12);
    const headY = top + stickH * 0.30 + bob;
    const neckY = headY + headR * 0.95 + bobIdle * 0.01;
    const shoulderY = top + stickH * 0.44 + bob;
    const hipY = top + stickH * 0.72 + bob;

    const armFreq = pose === "sprint" ? 18 : pose === "walk" ? 13 : 7;
    const legFreq = pose === "sprint" ? 18 : pose === "walk" ? 13 : 7;

    const armSwing =
      Math.sin(tSec * armFreq) *
      (pose === "idle" ? 0.22 : pose === "jump" ? 0.35 : pose === "fall" ? 0.45 : 1);
    const legSwing =
      Math.sin(tSec * legFreq + Math.PI) *
      (pose === "idle" ? 0.15 : pose === "jump" ? 0.55 : pose === "fall" ? 0.55 : 1);

    const lean =
      dir *
      (pose === "jump" ? -0.18 : pose === "fall" ? 0.22 : pose === "sprint" ? 0.07 : pose === "walk" ? 0.04 : 0);

    const strokeW = Math.max(2.6, stickW * 0.06);
    const jointR = Math.max(2.2, strokeW * 0.9);

    function dot(x, y, r) {
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(x, y, r + 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    function limb(x1, y1, x2, y2) {
      ctx.strokeStyle = outline;
      ctx.lineWidth = strokeW + 1.2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.strokeStyle = color;
      ctx.lineWidth = strokeW;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // ---- Head ----
    function drawHead() {
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(cx, headY, headR * 0.48, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(cx, headY, headR * 0.44, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      const eyeY = headY - headR * 0.12;
      const eyeX = headR * 0.22;
      ctx.fillStyle = outline;
      ctx.beginPath();
      ctx.arc(cx - eyeX, eyeY, Math.max(1.4, headR * 0.12), 0, Math.PI * 2);
      ctx.arc(cx + eyeX, eyeY, Math.max(1.4, headR * 0.12), 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- Torso ----
    function drawTorso() {
      const bodyRightX = cx + lean;
      limb(cx - lean, neckY, bodyRightX, hipY);
      dot(cx, neckY + 2, jointR);
      dot(cx, hipY, jointR);
    }

    // ---- Arms ----
    function drawArms() {
      const shoulderX = cx + lean * 0.6;
      const armSpanX =
        stickW *
        (pose === "idle" ? 0.10 : pose === "jump" ? 0.16 : pose === "fall" ? 0.16 : 0.20);

      const armRaiseY =
        pose === "jump"
          ? -stickH * (0.10 + 0.06 * jumpT)
          : pose === "fall"
            ? -stickH * 0.02
            : stickH * 0.01;

      const rHandX = shoulderX + dir * (armSpanX * (0.5 + armSwing * 0.35));
      const rHandY = shoulderY + stickH * 0.03 + armRaiseY - armSwing * stickH * 0.04;
      const lHandX = shoulderX - dir * (armSpanX * (0.5 - armSwing * 0.35));
      const lHandY = shoulderY + stickH * 0.03 + armRaiseY + armSwing * stickH * 0.04;

      limb(shoulderX, shoulderY, rHandX, rHandY);
      limb(shoulderX, shoulderY, lHandX, lHandY);
      dot(rHandX, rHandY, jointR);
      dot(lHandX, lHandY, jointR);
    }

    // ---- Legs ----
    function drawLegs() {
      const hipSpanX = stickW * 0.16;
      const legBaseLen = stickH * (pose === "idle" ? 0.24 : 0.30);
      const tuck =
        pose === "jump" ? 0.55 + 0.25 * jumpT : pose === "fall" ? 0.25 : 0;

      const rKneeX = cx + dir * hipSpanX * 0.25;
      const lKneeX = cx - dir * hipSpanX * 0.25;

      const rFootX =
        cx + dir * (hipSpanX + armSwing * stickW * 0.03 + legSwing * stickW * 0.06);
      const lFootX =
        cx - dir * (hipSpanX + armSwing * stickW * 0.03 - legSwing * stickW * 0.06);

      const rKneeY = hipY + legBaseLen * (0.42 + tuck * 0.35) + legSwing * stickH * 0.01;
      const lKneeY = hipY + legBaseLen * (0.42 + tuck * 0.35) - legSwing * stickH * 0.01;

      const rFootY = hipY + legBaseLen * (1.05 - tuck) + legSwing * stickH * 0.04;
      const lFootY = hipY + legBaseLen * (1.05 - tuck) - legSwing * stickH * 0.04;

      // Right leg
      limb(cx, hipY, rKneeX, rKneeY);
      limb(rKneeX, rKneeY, rFootX, rFootY);
      dot(rKneeX, rKneeY, jointR * 0.95);
      dot(rFootX, rFootY, jointR);

      // Left leg
      limb(cx, hipY, lKneeX, lKneeY);
      limb(lKneeX, lKneeY, lFootX, lFootY);
      dot(lKneeX, lKneeY, jointR * 0.95);
      dot(lFootX, lFootY, jointR);
    }

    drawHead();
    drawTorso();
    drawArms();
    drawLegs();

    // Pose-specific subtle lean line (mainly for fall)
    if (pose === "fall") {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = outline;
      ctx.lineWidth = strokeW + 0.8;
      ctx.beginPath();
      ctx.moveTo(cx, neckY);
      ctx.lineTo(cx + dir * stickW * 0.04, hipY + stickH * 0.02);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  DM.skins = DM.skins || {};
  DM.skins.stickman = {
    draw(tSec) {
      drawStickman(tSec ?? 0);
    }
  };
})(globalThis.DataMan);

