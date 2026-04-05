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
      angle: -Math.PI / 2,
      thrusting: false,
      thrustStartT: 0,
      onGround: false,
      currentPlatform: null
    },
    physics: {
      gravity: 0,
      jumpStrength: 0,
      moveSpeed: 0,
      physicsMode: "platformer",
      thrustPower: 0,
      rotateSpeed: 0,
      brakeRate: 0,
      snakeSpeed: 0,
      snakeCellSize: 0
    },
    visuals: {
      skin: "square",
      color: "#4ade80"
    },
    activeCharacterId: null,
    screenshot: {
      selecting: false,
      startX: 0,
      startY: 0
    },
    snake: {
      segments: [],
      direction: "right",
      nextDirection: "right",
      lastTickMs: 0,
      alive: true,
      lettersEaten: 0
    },
    /** `Element` for the DOM platform being passed through, or `'VIEWPORT_FLOOR'`, or `null`. */
    dropThroughIgnoreKey: null,
    lastPlatformRefresh: 0,
    running: true,
    /** Throttle passive domain + distance batching (not persisted). */
    passiveLogMeta: {
      distanceBuffer: 0,
      /** Avoid duplicate `domain_visit` rows for the same host in one load. */
      domainVisitSentFor: null
    }
  };

  DM.runtime = {
    canvas: null,
    ctx: null,
    rafId: 0
  };
})(globalThis.DataMan);
