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

    const maxV = 100;
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
      if (state.physics.physicsMode !== "platformer") return;
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
      if (state.physics.physicsMode !== "platformer") return;
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

      const perFrame = Math.hypot(player.vx, player.vy);
      const instantPxPerSec = Math.round(perFrame * 60);
      const smooth = 0.15;
      const prev = player.spaceSpeedPxPerSec || 0;
      player.spaceSpeedPxPerSec = prev + smooth * (instantPxPerSec - prev);
      if (instantPxPerSec > (player._maxVelLocal || 0)) {
        player._maxVelLocal = instantPxPerSec;
      }
      const now = performance.now();
      const MAX_VEL_FLUSH_INTERVAL = 5000;
      if (
        player._maxVelLocal > (player._lastFlushedMaxVel || 0) &&
        now - (player._lastMaxVelFlushMs || 0) > MAX_VEL_FLUSH_INTERVAL
      ) {
        player._lastFlushedMaxVel = player._maxVelLocal;
        player._lastMaxVelFlushMs = now;
        DM.bridge.reportMaxVelocityPxPerSec(player._maxVelLocal);
      }

      DM.passiveLog.recordTravel(player.x - prevX);

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (player.x < -player.w) player.x = vw;
      if (player.x > vw) player.x = -player.w;
      if (player.y < -player.h) player.y = vh;
      if (player.y > vh) player.y = -player.h;
    },

    initSnake() {
      const sn = state.snake;
      const cellSize = state.physics.snakeCellSize || 14;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const startX = Math.floor(vw / 2 / cellSize) * cellSize;
      const startY = Math.floor(vh / 2 / cellSize) * cellSize;
      sn.segments = [
        { x: startX, y: startY },
        { x: startX - cellSize, y: startY },
        { x: startX - cellSize * 2, y: startY }
      ];
      sn.direction = "right";
      sn.nextDirection = "right";
      sn.alive = true;
      sn.lastTickMs = performance.now();
      sn.lettersEaten = 0;

      state.player.x = startX;
      state.player.y = startY;
    },

    updateSnake() {
      const sn = state.snake;
      if (!sn.alive) {
        if (state.keys.has("Space")) {
          DM.physics.initSnake();
        }
        return;
      }

      const cellSize = state.physics.snakeCellSize || 14;
      const tickInterval = 1000 / (state.physics.snakeSpeed || 7);
      const now = performance.now();

      if (now - sn.lastTickMs < tickInterval) return;
      sn.lastTickMs = now;

      sn.direction = sn.nextDirection;
      const head = sn.segments[0];
      let nx = head.x;
      let ny = head.y;

      if (sn.direction === "up") ny -= cellSize;
      else if (sn.direction === "down") ny += cellSize;
      else if (sn.direction === "left") nx -= cellSize;
      else if (sn.direction === "right") nx += cellSize;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      if (nx < 0) nx = Math.floor((vw - cellSize) / cellSize) * cellSize;
      if (nx >= vw) nx = 0;
      if (ny < 0) ny = Math.floor((vh - cellSize) / cellSize) * cellSize;
      if (ny >= vh) ny = 0;

      for (let i = 0; i < sn.segments.length; i++) {
        if (sn.segments[i].x === nx && sn.segments[i].y === ny) {
          sn.alive = false;
          return;
        }
      }

      const newHead = { x: nx, y: ny };
      sn.segments.unshift(newHead);

      const eatResult = DM.snakeFood?.tryEat(nx, ny) ?? null;

      if (eatResult) {
        sn.lettersEaten++;
        sn.eatenBank.push(eatResult.char);

        DM.bridge.logPassiveEvent({
          eventType: "letter_eaten",
          domain: location.hostname,
          pageUrl: location.href,
          elementTag: eatResult.elementTag,
          selectorGuess: eatResult.selector,
          textPreview: eatResult.textPreview,
          extra: { char: eatResult.char }
        });
      } else {
        sn.segments.pop();
      }

      state.player.x = nx;
      state.player.y = ny;
    },

    update() {
      if (state.physics.physicsMode === "snake") {
        DM.physics.updateSnake();
      } else if (state.physics.physicsMode === "space") {
        DM.physics.updateSpace();
      } else {
        DM.physics.updatePlatformer();
      }
    }
  };
})(globalThis.DataMan);
