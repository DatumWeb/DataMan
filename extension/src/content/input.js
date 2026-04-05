(function (DM) {
  const { state } = DM;

  function inputTargetIsEditable(target) {
    if (!target) return false;
    const tag = target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
    if (target.isContentEditable) return true;
    return false;
  }

  DM.input = {
    wire() {
      window.addEventListener(
        "keydown",
        (event) => {
          if (inputTargetIsEditable(event.target)) return;
          const codes = [
            "ArrowLeft",
            "ArrowRight",
            "ArrowDown",
            "ArrowUp",
            "KeyA",
            "KeyD",
            "KeyS",
            "KeyW",
            "ShiftLeft",
            "ShiftRight",
            "Space"
          ];
          if (!codes.includes(event.code)) return;

          event.preventDefault();
          if (event.repeat) return;

          state.keys.add(event.code);

          const mode = state.physics.physicsMode;

          if (mode === "platformer") {
            if (event.code === "Space") DM.physics.tryJump();
            if (event.code === "ArrowDown" || event.code === "KeyS")
              DM.physics.triggerDropThrough();
            if (event.code === "ArrowUp" || event.code === "KeyW")
              DM.activeExtract.tryExtract(event.code);
          }

          if (mode === "space" && event.code === "Space") {
            DM.screenshot.beginSelection();
          }

          if (mode === "snake") {
            if (event.code === "Space") {
              if (!state.snake.alive && DM.physics?.initSnake) {
                DM.physics.initSnake();
              } else if (DM.snakeSpit?.canSpit()) {
                DM.snakeSpit.spit();
              }
            }
            const OPPOSITES = { up: "down", down: "up", left: "right", right: "left" };
            const sn = state.snake;
            let dir = null;
            if (event.code === "ArrowUp" || event.code === "KeyW") dir = "up";
            if (event.code === "ArrowDown" || event.code === "KeyS") dir = "down";
            if (event.code === "ArrowLeft" || event.code === "KeyA") dir = "left";
            if (event.code === "ArrowRight" || event.code === "KeyD") dir = "right";
            if (dir && OPPOSITES[dir] !== sn.direction) {
              sn.nextDirection = dir;
            }
          }
        },
        true
      );

      window.addEventListener(
        "keyup",
        (event) => {
          state.keys.delete(event.code);

          if (state.physics.physicsMode === "space" && event.code === "Space") {
            DM.screenshot.finishSelection();
          }
        },
        true
      );
    }
  };
})(globalThis.DataMan);
