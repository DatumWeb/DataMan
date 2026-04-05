(function (DM) {
  const { config, runtime, platforms } = DM;

  function resizeCanvas() {
    if (!runtime.canvas) return;
    runtime.canvas.width = window.innerWidth;
    runtime.canvas.height = window.innerHeight;
  }

  DM.overlay = {
    install() {
      const existing = document.getElementById(config.OVERLAY_ID);
      if (existing && runtime.ctx) return;
      if (existing) existing.remove();

      const root = document.createElement("div");
      root.id = config.OVERLAY_ID;
      root.setAttribute("data-dataman-overlay", "true");
      Object.assign(root.style, {
        position: "fixed",
        inset: "0",
        pointerEvents: "none",
        zIndex: "2147483647",
        margin: "0",
        padding: "0"
      });

      runtime.canvas = document.createElement("canvas");
      runtime.canvas.setAttribute("aria-hidden", "true");
      resizeCanvas();
      Object.assign(runtime.canvas.style, {
        display: "block",
        width: "100vw",
        height: "100vh",
        verticalAlign: "top"
      });

      root.appendChild(runtime.canvas);
      document.documentElement.appendChild(root);

      runtime.ctx = runtime.canvas.getContext("2d");

      window.addEventListener(
        "resize",
        () => {
          resizeCanvas();
          platforms.refresh();
        },
        { passive: true }
      );

      window.addEventListener(
        "scroll",
        () => {
          platforms.refresh();
        },
        { passive: true, capture: true }
      );
    },

    resizeCanvas
  };
})(globalThis.DataMan);
