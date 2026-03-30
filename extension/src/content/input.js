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
          if (event.repeat) return;
          const codes = [
            "ArrowLeft",
            "ArrowRight",
            "ArrowDown",
            "ArrowUp",
            "KeyA",
            "KeyD",
            "KeyS",
            "KeyW",
            "Space"
          ];
          if (!codes.includes(event.code)) return;

          if (event.code === "Space") event.preventDefault();
          if (event.code === "ArrowUp") event.preventDefault();

          state.keys.add(event.code);

          if (event.code === "Space") {
            DM.physics.tryJump();
          }
          if (event.code === "ArrowDown" || event.code === "KeyS") {
            DM.physics.triggerDropThrough();
          }

          if (event.code === "ArrowUp" || event.code === "KeyW") {
            DM.activeExtract.tryExtract(event.code);
          }
        },
        true
      );

      window.addEventListener(
        "keyup",
        (event) => {
          state.keys.delete(event.code);
        },
        true
      );
    }
  };
})(globalThis.DataMan);
