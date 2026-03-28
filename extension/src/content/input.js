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
            "KeyA",
            "KeyD",
            "KeyS",
            "Space"
          ];
          if (!codes.includes(event.code)) return;

          if (event.code === "Space") event.preventDefault();

          state.keys.add(event.code);

          if (event.code === "Space") {
            DM.physics.tryJump();
          }
          if (event.code === "ArrowDown" || event.code === "KeyS") {
            DM.physics.triggerDropThrough();
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
