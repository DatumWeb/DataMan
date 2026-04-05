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

  function processInput() {
    const { player, physics, keys } = state;
    let targetVx = 0;
    if (keys.has("ArrowLeft") || keys.has("KeyA")) targetVx -= physics.moveSpeed;
    if (keys.has("ArrowRight") || keys.has("KeyD")) targetVx += physics.moveSpeed;
    player.vx = targetVx;
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
      player.onGround = false;
      player.currentPlatform = null;
    },

    triggerDropThrough() {
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

    update() {
      const { player, physics } = state;
      const prevY = player.y;
      const prevX = player.x;

      processInput();
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
    }
  };
})(globalThis.DataMan);
