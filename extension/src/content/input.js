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

          const isSpaceMode = state.physics.physicsMode === "space";

          if (!isSpaceMode && event.code === "Space") {
            DM.physics.tryJump();
          }
          if (!isSpaceMode && (event.code === "ArrowDown" || event.code === "KeyS")) {
            DM.physics.triggerDropThrough();
          }
          if (!isSpaceMode && (event.code === "ArrowUp" || event.code === "KeyW")) {
            DM.activeExtract.tryExtract(event.code);
          }

          if (isSpaceMode && event.code === "Space") {
            DM.screenshot.beginSelection();
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
