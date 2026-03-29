(function (DM) {
  const { state, util } = DM;

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
      player.onGround = false;
      player.currentPlatform = null;
      player.y += 2;
      player.vy = Math.max(player.vy, 3);
      state.dropThroughUntil = Date.now() + 220;
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
