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
    skin: "square",
    color: "#4ade80",
    displayName: "Character"
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
      state.physics.gravity = def.gravity;
      state.physics.jumpStrength = def.jumpStrength;
      state.physics.moveSpeed = def.moveSpeed;
      state.visuals.skin = def.skin;
      state.visuals.color = def.color;
    }
  };
})(globalThis.DataMan);
