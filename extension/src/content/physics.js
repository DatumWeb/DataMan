(function (DM) {
  const { state, util } = DM;

  function intersects(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /** Stable handle: DOM node for real elements, or floor marker for the viewport slab. */
  function platformIgnoreKey(p) {
    if (!p) return null;
    if (p.elementTag === "VIEWPORT_FLOOR") return "VIEWPORT_FLOOR";
    return p.source || null;
  }

  function platformMatchesIgnoreKey(p, key) {
    if (key == null || key === undefined) return false;
    if (key === "VIEWPORT_FLOOR") return p.elementTag === "VIEWPORT_FLOOR";
    return p.source === key;
  }

  function findGroundCollision(nextPlayer, previousY) {
    if (nextPlayer.vy < 0) return null;

    const feet = nextPlayer.y + nextPlayer.h;
    const passSlop = 2;

    if (state.dropThroughIgnoreKey != null) {
      let ign = null;
      for (const p of state.platforms) {
        if (platformMatchesIgnoreKey(p, state.dropThroughIgnoreKey)) {
          ign = p;
          break;
        }
      }
      if (!ign) {
        state.dropThroughIgnoreKey = null;
      } else if (feet > ign.y + ign.h + passSlop) {
        state.dropThroughIgnoreKey = null;
      }
    }

    for (const p of state.platforms) {
      if (
        state.dropThroughIgnoreKey != null &&
        platformMatchesIgnoreKey(p, state.dropThroughIgnoreKey) &&
        feet <= p.y + p.h + passSlop
      ) {
        continue;
      }

      const wasAbove = previousY + nextPlayer.h <= p.y + 1;
      if (!wasAbove) continue;
      if (!intersects(nextPlayer, p)) continue;
      if (
        nextPlayer.y + nextPlayer.h >= p.y &&
        nextPlayer.y + nextPlayer.h <= p.y + Math.max(24, p.h + 6)
      ) {
        return p;
      }
    }
    return null;
  }

  function processInputPlatformer() {
    const { player, physics, keys } = state;
    let targetVx = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) targetVx -= physics.moveSpeed;
    if (keys.has("ArrowRight") || keys.has("KeyD")) targetVx += physics.moveSpeed;
    player.vx = targetVx;
  }

  function processInputSpace() {
    const { player, physics, keys } = state;
    const left = keys.has("ArrowLeft") || keys.has("KeyA");
    const right = keys.has("ArrowRight") || keys.has("KeyD");
    const thrust = keys.has("ArrowUp") || keys.has("KeyW");
    const brake = keys.has("ArrowDown") || keys.has("KeyS");

    if (left) player.angle -= physics.rotateSpeed;
    if (right) player.angle += physics.rotateSpeed;

    if (thrust) {
      player.vx += Math.cos(player.angle) * physics.thrustPower;
      player.vy += Math.sin(player.angle) * physics.thrustPower;
      if (!player.thrusting) {
        player.thrusting = true;
        player.thrustStartT = performance.now();
      }
    } else {
      player.thrusting = false;
    }

    if (brake) {
      const speed = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
      if (speed > 0.05) {
        const factor = Math.max(0, 1 - physics.brakeRate);
        player.vx *= factor;
        player.vy *= factor;
      } else {
        player.vx = 0;
        player.vy = 0;
      }
    }

    const maxV = 8;
    const spd = Math.sqrt(player.vx * player.vx + player.vy * player.vy);
    if (spd > maxV) {
      player.vx = (player.vx / spd) * maxV;
      player.vy = (player.vy / spd) * maxV;
    }
  }

  DM.physics = {
    spawnPlayerTopCenter() {
      const { player } = state;
      const vw = window.innerWidth;
      player.x = util.clamp(
        Math.round(vw / 2 - player.w / 2),
        16,
        Math.max(16, vw - player.w - 16)
      );
      player.y = 48;
      player.vx = 0;
      player.vy = 0;
      player.angle = -Math.PI / 2;
      player.thrusting = false;
      player.onGround = false;
      player.currentPlatform = null;
    },

    triggerDropThrough() {
      if (state.physics.physicsMode === "space") return;
      const { player } = state;
      if (!player.onGround) return;
      const stoodOn = player.currentPlatform;
      player.onGround = false;
      player.currentPlatform = null;
      player.y += 2;
      player.vy = Math.max(player.vy, 3);

      if (DM.platforms?.refresh) {
        DM.platforms.refresh();
        state.lastPlatformRefresh = performance.now();
      }

      if (stoodOn && stoodOn.elementTag === "VIEWPORT_FLOOR") {
        state.dropThroughIgnoreKey = "VIEWPORT_FLOOR";
      } else if (stoodOn && stoodOn.source) {
        state.dropThroughIgnoreKey = stoodOn.source;
      } else {
        state.dropThroughIgnoreKey = null;
      }
    },

    tryJump() {
      if (state.physics.physicsMode === "space") return;
      const { player, physics } = state;
      if (!player.onGround) return;
      const jumpingFrom = player.currentPlatform;
      player.vy = -physics.jumpStrength;
      player.onGround = false;
      player.currentPlatform = null;
      if (jumpingFrom) {
        DM.passiveLog.onJump(jumpingFrom);
      }
    },

    updatePlatformer() {
      const { player, physics } = state;
      const prevY = player.y;
      const prevX = player.x;

      processInputPlatformer();
      player.vy += physics.gravity;
      player.x += player.vx;
      player.y += player.vy;
      player.x = util.clamp(player.x, 0, Math.max(0, window.innerWidth - player.w));

      DM.passiveLog.recordTravel(player.x - prevX);

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
        DM.physics.spawnPlayerTopCenter();
      }
    },

    updateSpace() {
      const { player } = state;
      const prevX = player.x;

      processInputSpace();
      player.x += player.vx;
      player.y += player.vy;

      DM.passiveLog.recordTravel(player.x - prevX);

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (player.x < -player.w) player.x = vw;
      if (player.x > vw) player.x = -player.w;
      if (player.y < -player.h) player.y = vh;
      if (player.y > vh) player.y = -player.h;
    },

    update() {
      if (state.physics.physicsMode === "space") {
        DM.physics.updateSpace();
      } else {
        DM.physics.updatePlatformer();
      }
    }
  };
})(globalThis.DataMan);
