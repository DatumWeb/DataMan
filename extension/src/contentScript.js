/* DataMan — overlay, DOM platforms, physics, keyboard */

const OVERLAY_ID = "dataman-overlay-root";

/** Start narrow; expand later (see PLAN). */
const PLATFORM_SELECTOR = "h1,h2,h3,p,a";
const PLATFORM_MIN_WIDTH = 40;
const PLATFORM_MIN_HEIGHT = 8;

const state = {
  keys: new Set(),
  platforms: [],
  player: {
    x: 0,
    y: 48,
    w: 28,
    h: 28,
    vx: 0,
    vy: 0,
    onGround: false,
    currentPlatform: null
  },
  physics: {
    gravity: 0.65,
    jumpStrength: 11.5,
    moveSpeed: 4.2
  },
  visuals: {
    skin: "square",
    color: "#4ade80"
  },
  dropThroughUntil: 0,
  lastPlatformRefresh: 0,
  running: true
};

let canvas;
let ctx;
let rafId = 0;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function bestSelectorForElement(el) {
  if (!el?.tagName) return "";
  if (el.id) return `#${el.id}`;
  const classes = Array.from(el.classList || []).slice(0, 2);
  const cls = classes.length ? `.${classes.join(".")}` : "";
  return `${el.tagName.toLowerCase()}${cls}`;
}

function installOverlay() {
  if (document.getElementById(OVERLAY_ID)) return;

  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.setAttribute("data-dataman-overlay", "true");
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    pointerEvents: "none",
    zIndex: "2147483647",
    margin: "0",
    padding: "0"
  });

  canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  resizeCanvas();
  Object.assign(canvas.style, {
    display: "block",
    width: "100vw",
    height: "100vh",
    verticalAlign: "top"
  });

  root.appendChild(canvas);
  document.documentElement.appendChild(root);

  ctx = canvas.getContext("2d");

  window.addEventListener(
    "resize",
    () => {
      resizeCanvas();
      refreshPlatforms();
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      refreshPlatforms();
    },
    { passive: true, capture: true }
  );
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function refreshPlatforms() {
  const elements = Array.from(document.querySelectorAll(PLATFORM_SELECTOR));
  const next = [];
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;

  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    if (!rect || rect.width < PLATFORM_MIN_WIDTH || rect.height < PLATFORM_MIN_HEIGHT) continue;
    if (rect.bottom < -120 || rect.top > viewportH + 120) continue;
    if (rect.right < -120 || rect.left > viewportW + 120) continue;

    next.push({
      x: rect.left,
      y: rect.top,
      w: rect.width,
      h: rect.height,
      elementTag: (el.tagName || "UNKNOWN").toUpperCase(),
      selector: bestSelectorForElement(el),
      source: el
    });
  }

  next.push({
    x: 0,
    y: viewportH - 10,
    w: viewportW,
    h: 10,
    elementTag: "VIEWPORT_FLOOR",
    selector: "viewport-floor",
    source: null
  });

  state.platforms = next;
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function findGroundCollision(nextPlayer, previousY) {
  if (Date.now() < state.dropThroughUntil) return null;
  if (nextPlayer.vy < 0) return null;

  for (const p of state.platforms) {
    const wasAbove = previousY + nextPlayer.h <= p.y + 1;
    if (!wasAbove) continue;
    if (!intersects(nextPlayer, p)) continue;
    if (nextPlayer.y + nextPlayer.h >= p.y && nextPlayer.y + nextPlayer.h <= p.y + Math.max(24, p.h + 6)) {
      return p;
    }
  }
  return null;
}

function spawnPlayerTopCenter() {
  const { player } = state;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  player.x = clamp(Math.round(vw / 2 - player.w / 2), 16, Math.max(16, vw - player.w - 16));
  player.y = 48;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.currentPlatform = null;
}

function processInput() {
  const { player, physics, keys } = state;
  let targetVx = 0;
  if (keys.has("ArrowLeft") || keys.has("KeyA")) targetVx -= physics.moveSpeed;
  if (keys.has("ArrowRight") || keys.has("KeyD")) targetVx += physics.moveSpeed;
  player.vx = targetVx;
}

function triggerDropThrough() {
  const { player } = state;
  if (!player.onGround) return;
  player.onGround = false;
  player.currentPlatform = null;
  player.y += 2;
  player.vy = Math.max(player.vy, 3);
  state.dropThroughUntil = Date.now() + 220;
}

function updatePhysics() {
  const { player, physics } = state;
  const prevY = player.y;

  processInput();
  player.vy += physics.gravity;
  player.x += player.vx;
  player.y += player.vy;
  player.x = clamp(player.x, 0, Math.max(0, window.innerWidth - player.w));

  const ground = findGroundCollision(player, prevY);
  if (ground) {
    player.y = ground.y - player.h;
    player.vy = 0;
    player.onGround = true;
    player.currentPlatform = ground;
  } else {
    player.onGround = false;
    player.currentPlatform = null;
  }

  const vh = window.innerHeight;
  if (player.y > vh + 200) {
    spawnPlayerTopCenter();
  }
}

function inputTargetIsEditable(target) {
  if (!target) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return false;
}

function wireInput() {
  window.addEventListener(
    "keydown",
    (event) => {
      if (inputTargetIsEditable(event.target)) return;
      if (event.repeat) return;
      const codes = [
        "ArrowLeft",
        "ArrowRight",
        "ArrowDown",
        "KeyA",
        "KeyD",
        "KeyS",
        "Space"
      ];
      if (!codes.includes(event.code)) return;

      if (event.code === "Space") event.preventDefault();

      state.keys.add(event.code);

      if (event.code === "Space") {
        const { player, physics } = state;
        if (player.onGround) {
          player.vy = -physics.jumpStrength;
          player.onGround = false;
          player.currentPlatform = null;
        }
      }
      if (event.code === "ArrowDown" || event.code === "KeyS") {
        triggerDropThrough();
      }
    },
    true
  );

  window.addEventListener(
    "keyup",
    (event) => {
      state.keys.delete(event.code);
    },
    true
  );
}

function drawPlatforms() {
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
  if (!state.running || !ctx || !canvas) return;

  const t = now ?? performance.now();
  if (t - state.lastPlatformRefresh > 750) {
    refreshPlatforms();
    state.lastPlatformRefresh = t;
  }

  updatePhysics();

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlatforms();
  drawPlayer();
  drawHud();

  rafId = requestAnimationFrame(gameLoop);
}

function startGameLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  state.lastPlatformRefresh = performance.now();
  rafId = requestAnimationFrame(gameLoop);
}

async function syncVisualsFromStorage() {
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_STATE" });
    if (!res?.ok || !res.state) return;
    const id = res.state.activeCharacterId;
    const ch = res.state.characters?.[id];
    if (!ch) return;
    if (typeof ch.skin === "string") state.visuals.skin = ch.skin;
    if (typeof ch.colorHex === "string") state.visuals.color = ch.colorHex;
    const g = Number(ch.physics?.gravity ?? ch.gravity);
    const j = Number(ch.physics?.jumpStrength ?? ch.jumpStrength);
    const m = Number(ch.physics?.moveSpeed ?? ch.moveSpeed);
    if (!Number.isNaN(g)) state.physics.gravity = g;
    if (!Number.isNaN(j)) state.physics.jumpStrength = j;
    if (!Number.isNaN(m)) state.physics.moveSpeed = m;
  } catch {
    /* defaults */
  }
}

async function handshake() {
  try {
    const res = await browser.runtime.sendMessage({
      type: "CS_HELLO",
      domain: location.hostname,
      pageUrl: location.href
    });
    console.log("[DataMan] background replied (CS_HELLO)", res);
  } catch (e) {
    console.warn("[DataMan] CS_HELLO failed", e);
  }
}

(async function init() {
  console.log("[DataMan] content script loaded on", location.hostname);

  installOverlay();
  wireInput();
  spawnPlayerTopCenter();
  refreshPlatforms();

  await syncVisualsFromStorage();
  startGameLoop();

  await handshake();
})();
