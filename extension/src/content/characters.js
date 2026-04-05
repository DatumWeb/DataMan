/**
 * Character registry — single source of truth for physics and visuals.
 *
 * Every character inherits from BaseCharacter and can override any field.
 * Storage never stores or returns physics; this file is authoritative.
 */
(function (DM) {
  const BaseCharacter = Object.freeze({
    gravity: 0.2,
    jumpStrength: 9.5,
    moveSpeed: 2,
    physicsMode: "platformer",
    skin: "square",
    color: "#4ade80",
    displayName: "Character",
    thrustPower: 0,
    rotateSpeed: 0,
    brakeRate: 0,
    snakeSpeed: 0,
    snakeCellSize: 0
  });

  function defineCharacter(overrides) {
    return Object.freeze({ ...BaseCharacter, ...overrides });
  }

  const REGISTRY = {
    "char-default": defineCharacter({
      displayName: "Runner",
      skin: "square",
      color: "#4ade80"
    }),
    "char-stickman": defineCharacter({
      displayName: "StickMan",
      skin: "stickman",
      color: "#60a5fa",
      gravity: 0.1,
      jumpStrength: 7,
      moveSpeed: 2
    }),
    "char-snake": defineCharacter({
      displayName: "SnakeMan",
      skin: "snake",
      color: "#22c55e",
      physicsMode: "snake",
      gravity: 0,
      jumpStrength: 0,
      moveSpeed: 0,
      snakeSpeed: 7,
      snakeCellSize: 14
    }),
    "char-astroman": defineCharacter({
      displayName: "AstroMan",
      skin: "astroman",
      color: "#a78bfa",
      physicsMode: "space",
      gravity: 0,
      jumpStrength: 0,
      moveSpeed: 0,
      thrustPower: 0.009,
      rotateSpeed: 0.05,
      brakeRate: 0.02
    })
  };

  DM.characters = {
    BaseCharacter,

    get(id) {
      return REGISTRY[id] || { ...BaseCharacter, displayName: id };
    },

    list() {
      return Object.entries(REGISTRY).map(([id, def]) => ({ id, ...def }));
    },

    ids() {
      return Object.keys(REGISTRY);
    },

    /** Apply a character definition's physics + visuals to the live game state. */
    applyToState(id) {
      const def = DM.characters.get(id);
      const { state } = DM;
      state.activeCharacterId = id;
      state.physics.gravity = def.gravity;
      state.physics.jumpStrength = def.jumpStrength;
      state.physics.moveSpeed = def.moveSpeed;
      state.physics.physicsMode = def.physicsMode;
      state.physics.thrustPower = def.thrustPower;
      state.physics.rotateSpeed = def.rotateSpeed;
      state.physics.brakeRate = def.brakeRate;
      state.physics.snakeSpeed = def.snakeSpeed;
      state.physics.snakeCellSize = def.snakeCellSize;
      state.visuals.skin = def.skin;
      state.visuals.color = def.color;

      if (def.physicsMode === "snake" && DM.physics?.initSnake) {
        if (!state.snake.segments.length) {
          DM.physics.initSnake();
        }
      }
    }
  };
})(globalThis.DataMan);
