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

  /* ──────────────────────────────────────────────────────────────────────
   * animationShatter — rectangle-shaped shatter explosion (commented out)
   * ────────────────────────────────────────────────────────────────────── */
  /*
  const SHATTER_DURATION_MS = 800;
  const SHATTER_EDGE_PARTICLES = 12;
  const SHATTER_CORNER_PARTICLES = 4;
  const SHATTER_COLORS = ["#a78bfa","#c4b5fd","#7c3aed","#f0abfc","#e879f9","#fbbf24","#fff"];

  function shatterRandColor() {
    return SHATTER_COLORS[Math.floor(Math.random() * SHATTER_COLORS.length)];
  }

  function spawnShatter(rect) {
    const { x, y, w, h } = rect;
    const particles = [];
    const edgeTotal = SHATTER_EDGE_PARTICLES * 4;
    for (let i = 0; i < edgeTotal; i++) {
      let px, py, nx, ny;
      const pos = Math.random();
      const edge = Math.floor(Math.random() * 4);
      if (edge === 0)      { px = x + pos * w; py = y;     nx = 0;  ny = -1; }
      else if (edge === 1) { px = x + w;       py = y + pos * h; nx = 1;  ny = 0;  }
      else if (edge === 2) { px = x + pos * w; py = y + h;  nx = 0;  ny = 1;  }
      else                 { px = x;            py = y + pos * h; nx = -1; ny = 0;  }
      const speed = 50 + Math.random() * 120;
      const spread = (Math.random() - 0.5) * 0.7;
      particles.push({
        x: px, y: py,
        vx: (nx + spread) * speed, vy: (ny + spread) * speed,
        size: 2 + Math.random() * 3.5, color: shatterRandColor(),
        rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 10
      });
    }
    const corners = [
      { cx: x, cy: y, dx: -1, dy: -1 },
      { cx: x + w, cy: y, dx: 1, dy: -1 },
      { cx: x + w, cy: y + h, dx: 1, dy: 1 },
      { cx: x, cy: y + h, dx: -1, dy: 1 }
    ];
    for (const c of corners) {
      for (let j = 0; j < SHATTER_CORNER_PARTICLES; j++) {
        const speed = 80 + Math.random() * 100;
        const angle = Math.atan2(c.dy, c.dx) + (Math.random() - 0.5) * 0.8;
        particles.push({
          x: c.cx, y: c.cy,
          vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
          size: 3 + Math.random() * 3, color: shatterRandColor(),
          rot: Math.random() * Math.PI * 2, rotV: (Math.random() - 0.5) * 10
        });
      }
    }
    const SHARD_COUNT = 16;
    const shards = [];
    for (let i = 0; i < SHARD_COUNT; i++) {
      const edge = Math.floor(Math.random() * 4);
      let sx, sy, sw, sh, nvx, nvy;
      const segLen = (edge < 2 ? w : h) / (SHARD_COUNT / 4);
      if (edge === 0)      { sx = x + Math.random() * w; sy = y;     sw = segLen + Math.random() * 10; sh = 2; nvx = 0; nvy = -1; }
      else if (edge === 1) { sx = x + w; sy = y + Math.random() * h; sw = 2; sh = segLen + Math.random() * 10; nvx = 1; nvy = 0; }
      else if (edge === 2) { sx = x + Math.random() * w; sy = y + h;  sw = segLen + Math.random() * 10; sh = 2; nvx = 0; nvy = 1; }
      else                 { sx = x; sy = y + Math.random() * h;      sw = 2; sh = segLen + Math.random() * 10; nvx = -1; nvy = 0; }
      const speed = 30 + Math.random() * 80;
      shards.push({
        x: sx, y: sy, w: sw, h: sh,
        vx: nvx * speed + (Math.random() - 0.5) * 20,
        vy: nvy * speed + (Math.random() - 0.5) * 20,
        rot: 0, rotV: (Math.random() - 0.5) * 4,
        color: Math.random() < 0.5 ? "#a78bfa" : "#c4b5fd"
      });
    }
    state.screenshot.explosion = {
      startMs: performance.now(), rect: { ...rect }, particles, shards, style: "shatter"
    };
  }

  function drawShatter() {
    const expl = state.screenshot.explosion;
    if (!expl || expl.style !== "shatter") return;
    const { ctx } = runtime;
    if (!ctx) return;
    const elapsed = performance.now() - expl.startMs;
    if (elapsed > SHATTER_DURATION_MS) { state.screenshot.explosion = null; return; }
    const t = elapsed / SHATTER_DURATION_MS;
    const fadeAlpha = 1 - t * t;
    const dtSec = elapsed / 1000;
    const r = expl.rect;
    ctx.save(); ctx.globalAlpha = fadeAlpha;
    if (t < 0.6) {
      const expand = t * 60;
      const ringA = Math.max(0, 1 - t * 2) * 0.7;
      ctx.strokeStyle = `rgba(167,139,250,${ringA})`;
      ctx.lineWidth = Math.max(0.5, 2.5 - t * 3);
      ctx.strokeRect(r.x - expand, r.y - expand, r.w + expand * 2, r.h + expand * 2);
    }
    if (t < 0.12) {
      const flashA = (1 - t / 0.12) * 0.4;
      ctx.fillStyle = `rgba(255,255,255,${flashA})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    for (const s of expl.shards) {
      const drag = 1 - t * 0.5;
      ctx.save(); ctx.globalAlpha = fadeAlpha * Math.max(0, 1 - t * 1.3);
      ctx.translate(s.x + s.vx * dtSec * drag + s.w / 2, s.y + s.vy * dtSec * drag + s.h / 2);
      ctx.rotate(s.rot + s.rotV * dtSec);
      ctx.fillStyle = s.color; ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h);
      ctx.restore();
    }
    for (const p of expl.particles) {
      const drag = 1 - t * 0.55;
      const sz = p.size * (1 - t * 0.6);
      if (sz <= 0) continue;
      ctx.save();
      ctx.translate(p.x + p.vx * dtSec * drag, p.y + p.vy * dtSec * drag + 30 * dtSec * dtSec);
      ctx.rotate(p.rot + p.rotV * dtSec);
      ctx.fillStyle = p.color; ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
      ctx.restore();
    }
    ctx.restore();
  }
  */ // end animationShatter

  /* ──────────────────────────────────────────────────────────────────────
   * animationBlackHole — space-warp distortion (commented out)
   * ────────────────────────────────────────────────────────────────────── */
  /*
  const BH_DURATION_MS = 1200;
  const BH_RING_COUNT = 5;
  const BH_STAR_COUNT = 40;

  function spawnBlackHole(rect) {
    const { x, y, w, h } = rect;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const stars = [];
    const margin = Math.max(w, h) * 0.6;
    for (let i = 0; i < BH_STAR_COUNT; i++) {
      const edge = Math.floor(Math.random() * 4);
      let sx, sy;
      if (edge === 0)      { sx = x + Math.random() * w;          sy = y - Math.random() * margin; }
      else if (edge === 1) { sx = x + w + Math.random() * margin; sy = y + Math.random() * h; }
      else if (edge === 2) { sx = x + Math.random() * w;          sy = y + h + Math.random() * margin; }
      else                 { sx = x - Math.random() * margin;     sy = y + Math.random() * h; }
      const angle = Math.atan2(cy - sy, cx - sx);
      stars.push({
        x: sx, y: sy, angle,
        dist: Math.hypot(sx - cx, sy - cy),
        speed: 0.4 + Math.random() * 0.6,
        size: 1 + Math.random() * 2.5,
        brightness: 0.5 + Math.random() * 0.5
      });
    }
    state.screenshot.explosion = {
      startMs: performance.now(), rect: { ...rect }, cx, cy, stars
    };
  }

  function drawBlackHole() {
    const expl = state.screenshot.explosion;
    if (!expl) return;
    const { ctx } = runtime;
    if (!ctx) return;
    const elapsed = performance.now() - expl.startMs;
    if (elapsed > BH_DURATION_MS) { state.screenshot.explosion = null; return; }
    const t = elapsed / BH_DURATION_MS;
    const r = expl.rect;
    const cx = expl.cx;
    const cy = expl.cy;
    ctx.save();
    const collapseT = Math.min(t / 0.5, 1);
    const releaseT = Math.max(0, (t - 0.5) / 0.5);
    const vignetteAlpha = (collapseT < 1 ? collapseT * 0.55 : 0.55 * (1 - releaseT));
    const shrink = collapseT * 20;
    const vigGrad = ctx.createRadialGradient(cx, cy, Math.min(r.w, r.h) * 0.15, cx, cy, Math.max(r.w, r.h) * 0.8);
    vigGrad.addColorStop(0, `rgba(15,5,40,${vignetteAlpha})`);
    vigGrad.addColorStop(0.6, `rgba(30,10,60,${vignetteAlpha * 0.5})`);
    vigGrad.addColorStop(1, `rgba(0,0,0,0)`);
    ctx.fillStyle = vigGrad;
    ctx.fillRect(r.x - r.w * 0.5, r.y - r.h * 0.5, r.w * 2, r.h * 2);
    const warpAmt = collapseT * shrink;
    const borderAlpha = collapseT < 1 ? 0.3 + collapseT * 0.5 : 0.8 * (1 - releaseT);
    for (let ring = 0; ring < BH_RING_COUNT; ring++) {
      const offset = ring * 3 - 6;
      const warp = warpAmt * (1 - ring * 0.15);
      const alpha = borderAlpha * (1 - ring * 0.18);
      if (alpha <= 0) continue;
      ctx.strokeStyle = `hsla(${260 + ring * 12},80%,70%,${alpha})`;
      ctx.lineWidth = Math.max(0.5, 2.5 - ring * 0.4);
      ctx.beginPath();
      const topBow = warp * 0.8;
      const rightBow = warp * 0.8;
      ctx.moveTo(r.x + warp + offset, r.y + offset);
      ctx.quadraticCurveTo(cx, r.y + topBow + offset, r.x + r.w - warp + offset, r.y + offset);
      ctx.quadraticCurveTo(r.x + r.w - rightBow + offset, cy, r.x + r.w - warp + offset, r.y + r.h + offset);
      ctx.quadraticCurveTo(cx, r.y + r.h - topBow + offset, r.x + warp + offset, r.y + r.h + offset);
      ctx.quadraticCurveTo(r.x + rightBow + offset, cy, r.x + warp + offset, r.y + offset);
      ctx.closePath(); ctx.stroke();
    }
    for (const star of expl.stars) {
      const pull = collapseT * star.speed;
      const finalDist = Math.max(star.dist * (1 - pull * 0.9), 2);
      const fadeIn = Math.min(collapseT * 3, 1);
      const fadeOut = collapseT < 1 ? 1 : (1 - releaseT);
      const starAlpha = star.brightness * fadeIn * fadeOut;
      if (starAlpha <= 0.01) continue;
      const spiralAngle = star.angle + collapseT * 2.5 * star.speed;
      const stretch = 1 + collapseT * 3 * star.speed;
      const sz = star.size * (collapseT < 1 ? 1 : (1 - releaseT * 0.7));
      ctx.save(); ctx.globalAlpha = starAlpha;
      ctx.translate(cx + Math.cos(spiralAngle) * finalDist, cy + Math.sin(spiralAngle) * finalDist);
      ctx.rotate(spiralAngle);
      ctx.fillStyle = "#c4b5fd";
      ctx.fillRect(-sz * stretch / 2, -sz / 2, sz * stretch, sz);
      ctx.restore();
    }
    const glowIntensity = collapseT < 1 ? collapseT * 0.6 : 0.6 * (1 - releaseT * releaseT);
    if (glowIntensity > 0.01) {
      const glowR = Math.min(r.w, r.h) * 0.25 * (1 + releaseT * 2);
      const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
      glow.addColorStop(0, `rgba(167,139,250,${glowIntensity})`);
      glow.addColorStop(0.4, `rgba(124,58,237,${glowIntensity * 0.5})`);
      glow.addColorStop(1, `rgba(124,58,237,0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
    }
    if (releaseT > 0 && releaseT < 0.2) {
      const flashA = (1 - releaseT / 0.2) * 0.3;
      ctx.fillStyle = `rgba(200,180,255,${flashA})`;
      ctx.fillRect(r.x, r.y, r.w, r.h);
    }
    ctx.restore();
  }
  */ // end animationBlackHole

  /* ──────────────────────────────────────────────────────────────────────
   * animationSupernova — fast black-hole collapse → massive explosion
   * ────────────────────────────────────────────────────────────────────── */

  const SN_COLLAPSE_MS = 350;
  const SN_EXPLODE_MS  = 900;
  const SN_TOTAL_MS    = SN_COLLAPSE_MS + SN_EXPLODE_MS;
  const SN_RING_COUNT  = 4;
  const SN_STAR_COUNT  = 50;
  const SN_BURST_PARTICLES = 90;
  const SN_SHOCKWAVE_COUNT = 3;
  const SN_SPARK_COUNT = 36;
  const SN_COLORS = [
    "#a78bfa", "#c4b5fd", "#7c3aed", "#f0abfc", "#e879f9",
    "#fbbf24", "#fb923c", "#f43f5e", "#38bdf8", "#ffffff"
  ];

  function snRandColor() {
    return SN_COLORS[Math.floor(Math.random() * SN_COLORS.length)];
  }

  function spawnSupernova(rect) {
    const { x, y, w, h } = rect;
    const cx = x + w / 2;
    const cy = y + h / 2;

    const stars = [];
    const margin = Math.max(w, h) * 0.7;
    for (let i = 0; i < SN_STAR_COUNT; i++) {
      const edge = Math.floor(Math.random() * 4);
      let sx, sy;
      if (edge === 0)      { sx = x + Math.random() * w;           sy = y - Math.random() * margin; }
      else if (edge === 1) { sx = x + w + Math.random() * margin;  sy = y + Math.random() * h; }
      else if (edge === 2) { sx = x + Math.random() * w;           sy = y + h + Math.random() * margin; }
      else                 { sx = x - Math.random() * margin;      sy = y + Math.random() * h; }
      stars.push({
        x: sx, y: sy,
        angle: Math.atan2(cy - sy, cx - sx),
        dist: Math.hypot(sx - cx, sy - cy),
        speed: 0.5 + Math.random() * 0.5,
        size: 1 + Math.random() * 2.5,
        brightness: 0.5 + Math.random() * 0.5
      });
    }

    const burstParticles = [];
    for (let i = 0; i < SN_BURST_PARTICLES; i++) {
      const onEdge = Math.random() < 0.6;
      let px, py;
      if (onEdge) {
        const edge = Math.floor(Math.random() * 4);
        if (edge === 0)      { px = x + Math.random() * w; py = y; }
        else if (edge === 1) { px = x + w; py = y + Math.random() * h; }
        else if (edge === 2) { px = x + Math.random() * w; py = y + h; }
        else                 { px = x; py = y + Math.random() * h; }
      } else {
        px = cx; py = cy;
      }
      const angle = Math.atan2(py - cy, px - cx) + (Math.random() - 0.5) * 1.2;
      const speed = 100 + Math.random() * 300;
      burstParticles.push({
        x: px, y: py,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 1.5 + Math.random() * 5,
        color: snRandColor(),
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 14,
        trail: Math.random() < 0.4
      });
    }

    const sparks = [];
    for (let i = 0; i < SN_SPARK_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / SN_SPARK_COUNT + (Math.random() - 0.5) * 0.3;
      const speed = 200 + Math.random() * 250;
      sparks.push({
        angle,
        speed,
        length: 8 + Math.random() * 20,
        color: Math.random() < 0.5 ? "#ffffff" : "#fbbf24"
      });
    }

    state.screenshot.explosion = {
      startMs: performance.now(),
      rect: { ...rect },
      cx, cy,
      stars,
      burstParticles,
      sparks
    };
  }

  function drawSupernova() {
    const expl = state.screenshot.explosion;
    if (!expl) return;

    const { ctx } = runtime;
    if (!ctx) return;

    const elapsed = performance.now() - expl.startMs;
    if (elapsed > SN_TOTAL_MS) {
      state.screenshot.explosion = null;
      return;
    }

    const r = expl.rect;
    const cx = expl.cx;
    const cy = expl.cy;

    const inCollapse = elapsed < SN_COLLAPSE_MS;
    const collapseT = Math.min(elapsed / SN_COLLAPSE_MS, 1);
    const explodeElapsed = Math.max(0, elapsed - SN_COLLAPSE_MS);
    const explodeT = Math.min(explodeElapsed / SN_EXPLODE_MS, 1);

    ctx.save();

    /* ── PHASE 1: fast collapse ── */

    if (inCollapse) {
      const easeIn = collapseT * collapseT;

      // dark pull
      const vigA = easeIn * 0.65;
      const vigGrad = ctx.createRadialGradient(
        cx, cy, Math.min(r.w, r.h) * 0.1,
        cx, cy, Math.max(r.w, r.h) * 0.85
      );
      vigGrad.addColorStop(0, `rgba(10, 0, 30, ${vigA})`);
      vigGrad.addColorStop(0.5, `rgba(20, 5, 50, ${vigA * 0.5})`);
      vigGrad.addColorStop(1, `rgba(0, 0, 0, 0)`);
      ctx.fillStyle = vigGrad;
      ctx.fillRect(r.x - r.w * 0.6, r.y - r.h * 0.6, r.w * 2.2, r.h * 2.2);

      // warping border
      const shrink = easeIn * 25;
      const bAlpha = 0.3 + easeIn * 0.6;
      for (let ring = 0; ring < SN_RING_COUNT; ring++) {
        const off = ring * 2.5 - 3;
        const warp = shrink * (1 - ring * 0.2);
        const a = bAlpha * (1 - ring * 0.2);
        if (a <= 0) continue;
        ctx.strokeStyle = `hsla(${265 + ring * 15}, 85%, 72%, ${a})`;
        ctx.lineWidth = Math.max(0.5, 2.5 - ring * 0.5);
        const bow = warp * 0.85;
        ctx.beginPath();
        ctx.moveTo(r.x + warp + off, r.y + off);
        ctx.quadraticCurveTo(cx, r.y + bow + off, r.x + r.w - warp + off, r.y + off);
        ctx.quadraticCurveTo(r.x + r.w - bow + off, cy, r.x + r.w - warp + off, r.y + r.h + off);
        ctx.quadraticCurveTo(cx, r.y + r.h - bow + off, r.x + warp + off, r.y + r.h + off);
        ctx.quadraticCurveTo(r.x + bow + off, cy, r.x + warp + off, r.y + off);
        ctx.closePath();
        ctx.stroke();
      }

      // stars sucked in fast
      for (const star of expl.stars) {
        const pull = easeIn * star.speed;
        const finalDist = Math.max(star.dist * (1 - pull * 0.95), 1);
        const sA = star.brightness * Math.min(collapseT * 4, 1);
        if (sA < 0.01) continue;
        const spiral = star.angle + easeIn * 3.5 * star.speed;
        const stretch = 1 + easeIn * 4 * star.speed;
        const sz = star.size;
        ctx.save();
        ctx.globalAlpha = sA;
        ctx.translate(cx + Math.cos(spiral) * finalDist, cy + Math.sin(spiral) * finalDist);
        ctx.rotate(spiral);
        ctx.fillStyle = "#c4b5fd";
        ctx.fillRect(-sz * stretch / 2, -sz / 2, sz * stretch, sz);
        ctx.restore();
      }

      // center glow building up
      const glowI = easeIn * 0.8;
      const glowR = Math.min(r.w, r.h) * 0.2 * (1 - easeIn * 0.5);
      if (glowR > 1) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
        g.addColorStop(0, `rgba(200, 170, 255, ${glowI})`);
        g.addColorStop(0.5, `rgba(124, 58, 237, ${glowI * 0.4})`);
        g.addColorStop(1, `rgba(124, 58, 237, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - glowR, cy - glowR, glowR * 2, glowR * 2);
      }
    }

    /* ── PHASE 2: massive explosion ── */

    if (!inCollapse) {
      const easeOut = 1 - (1 - explodeT) * (1 - explodeT);
      const dtSec = explodeElapsed / 1000;

      // big white flash at detonation
      if (explodeT < 0.08) {
        const flashA = (1 - explodeT / 0.08) * 0.7;
        ctx.fillStyle = `rgba(255, 255, 255, ${flashA})`;
        ctx.fillRect(
          r.x - r.w * 0.3, r.y - r.h * 0.3,
          r.w * 1.6, r.h * 1.6
        );
      }

      // secondary colored flash
      if (explodeT < 0.15) {
        const f2 = (1 - explodeT / 0.15) * 0.5;
        ctx.fillStyle = `rgba(167, 139, 250, ${f2})`;
        ctx.fillRect(r.x, r.y, r.w, r.h);
      }

      // multiple expanding rectangular shockwaves
      for (let sw = 0; sw < SN_SHOCKWAVE_COUNT; sw++) {
        const delay = sw * 0.08;
        const swT = Math.max(0, explodeT - delay);
        if (swT <= 0 || swT > 0.7) continue;
        const expand = swT * 180 * (1 + sw * 0.3);
        const swAlpha = Math.max(0, 1 - swT * 2) * (0.6 - sw * 0.15);
        const lw = Math.max(0.5, 3 - swT * 4 - sw * 0.5);
        const hue = 260 + sw * 30;
        ctx.strokeStyle = `hsla(${hue}, 80%, 70%, ${swAlpha})`;
        ctx.lineWidth = lw;
        ctx.strokeRect(
          r.x - expand, r.y - expand,
          r.w + expand * 2, r.h + expand * 2
        );
      }

      // radial glow expanding from center
      const glowExp = easeOut * Math.max(r.w, r.h) * 1.2;
      const glowA = Math.max(0, 0.5 * (1 - explodeT * 1.2));
      if (glowA > 0.01 && glowExp > 1) {
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowExp);
        g.addColorStop(0, `rgba(167, 139, 250, ${glowA})`);
        g.addColorStop(0.3, `rgba(124, 58, 237, ${glowA * 0.4})`);
        g.addColorStop(0.6, `rgba(251, 191, 36, ${glowA * 0.2})`);
        g.addColorStop(1, `rgba(0, 0, 0, 0)`);
        ctx.fillStyle = g;
        ctx.fillRect(cx - glowExp, cy - glowExp, glowExp * 2, glowExp * 2);
      }

      // spark lines radiating from center
      const sparkFade = Math.max(0, 1 - explodeT * 1.5);
      if (sparkFade > 0.01) {
        for (const sp of expl.sparks) {
          const dist = easeOut * sp.speed * 0.6;
          const sx = cx + Math.cos(sp.angle) * dist;
          const sy = cy + Math.sin(sp.angle) * dist;
          const ex = cx + Math.cos(sp.angle) * (dist + sp.length * (1 - easeOut * 0.5));
          const ey = cy + Math.sin(sp.angle) * (dist + sp.length * (1 - easeOut * 0.5));
          ctx.save();
          ctx.globalAlpha = sparkFade;
          ctx.strokeStyle = sp.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.restore();
        }
      }

      // burst particles flying outward from edges and center
      const particleFade = Math.max(0, 1 - explodeT * explodeT);
      for (const p of expl.burstParticles) {
        const drag = 1 - easeOut * 0.4;
        const px = p.x + p.vx * dtSec * drag;
        const py = p.y + p.vy * dtSec * drag + 50 * dtSec * dtSec;
        const sz = p.size * (1 - easeOut * 0.5);
        if (sz <= 0.3) continue;

        ctx.save();
        ctx.globalAlpha = particleFade * (p.trail ? 0.7 : 1);

        // motion trail for some particles
        if (p.trail && explodeT < 0.6) {
          const trailLen = 3;
          for (let ti = 1; ti <= trailLen; ti++) {
            const tt = dtSec - ti * 0.012;
            if (tt < 0) continue;
            const tx = p.x + p.vx * tt * drag;
            const ty = p.y + p.vy * tt * drag + 50 * tt * tt;
            const tSz = sz * (1 - ti * 0.25);
            if (tSz <= 0) continue;
            ctx.globalAlpha = particleFade * 0.2 * (1 - ti / (trailLen + 1));
            ctx.fillStyle = p.color;
            ctx.fillRect(tx - tSz / 2, ty - tSz / 2, tSz, tSz);
          }
          ctx.globalAlpha = particleFade * 0.7;
        }

        ctx.translate(px, py);
        ctx.rotate(p.rot + p.rotV * dtSec);
        ctx.fillStyle = p.color;
        ctx.fillRect(-sz / 2, -sz / 2, sz, sz);
        ctx.restore();
      }

      // fading ring remnants at the rectangle border
      const remnantA = Math.max(0, 0.4 * (1 - explodeT * 2));
      if (remnantA > 0.01) {
        ctx.strokeStyle = `rgba(167, 139, 250, ${remnantA})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
        ctx.setLineDash([]);
      }
    }

    ctx.restore();
  }

  /* ──────────────────────────────────────────────────────────────────────
   * Public API
   * ────────────────────────────────────────────────────────────────────── */

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

      const savedRect = { x: rect.x, y: rect.y, w: rect.w, h: rect.h };

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
          spawnSupernova(savedRect);
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
    },

    drawExplosion() {
      drawSupernova();
    }
  };
})(globalThis.DataMan);
