/* DataMan — page overlay + placeholder avatar */

const OVERLAY_ID = "dataman-overlay-root";

const avatar = {
  player: {
    x: 80,
    y: 120,
    w: 28,
    h: 28
  },
  visuals: {
    skin: "square",
    color: "#4ade80"
  }
};

let canvas;
let ctx;
let rafId = 0;

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
      layoutPlayer();
    },
    { passive: true }
  );
}

function resizeCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

/** Placeholder position until physics: top center. */
function layoutPlayer() {
  const { player } = avatar;
  player.x = Math.max(16, Math.round(window.innerWidth / 2 - player.w / 2));
  player.y = 48;
}

function drawPlayer() {
  const { player } = avatar;
  if (!ctx) return;

  ctx.save();
  ctx.fillStyle = avatar.visuals.color;

  const skin = avatar.visuals.skin;
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

function tick() {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawPlayer();
  rafId = requestAnimationFrame(tick);
}

function startRenderLoop() {
  if (rafId) cancelAnimationFrame(rafId);
  layoutPlayer();
  rafId = requestAnimationFrame(tick);
}

async function syncVisualsFromStorage() {
  try {
    const res = await browser.runtime.sendMessage({ type: "GET_STATE" });
    if (!res?.ok || !res.state) return;
    const id = res.state.activeCharacterId;
    const ch = res.state.characters?.[id];
    if (!ch) return;
    if (typeof ch.skin === "string") avatar.visuals.skin = ch.skin;
    if (typeof ch.colorHex === "string") avatar.visuals.color = ch.colorHex;
  } catch {
    /* keep defaults */
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
  // Draw immediately; do not wait on messaging (popup-only tests don’t inject here).
  installOverlay();
  startRenderLoop();

  await handshake();
  await syncVisualsFromStorage();
})();
