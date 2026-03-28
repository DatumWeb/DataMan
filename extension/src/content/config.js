(function (DM) {
  DM.config = {
    OVERLAY_ID: "dataman-overlay-root",
    /** Narrow set first; expand in platforms.js / PLAN */
    PLATFORM_SELECTOR: "h1,h2,h3,p,a",
    PLATFORM_MIN_WIDTH: 40,
    PLATFORM_MIN_HEIGHT: 8
  };

  DM.util = {
    clamp(n, min, max) {
      return Math.min(max, Math.max(min, n));
    },
    bestSelectorForElement(el) {
      if (!el?.tagName) return "";
      if (el.id) return `#${el.id}`;
      const classes = Array.from(el.classList || []).slice(0, 2);
      const cls = classes.length ? `.${classes.join(".")}` : "";
      return `${el.tagName.toLowerCase()}${cls}`;
    }
  };
})(globalThis.DataMan);
