(function (DM) {
  DM.state = {
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

  DM.runtime = {
    canvas: null,
    ctx: null,
    rafId: 0
  };
})(globalThis.DataMan);
