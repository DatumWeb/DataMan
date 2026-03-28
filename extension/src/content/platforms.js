(function (DM) {
  const { state, config, util } = DM;

  DM.platforms = {
    refresh() {
      const elements = Array.from(document.querySelectorAll(config.PLATFORM_SELECTOR));
      const next = [];
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;

      for (const el of elements) {
        const rect = el.getBoundingClientRect();
        if (!rect || rect.width < config.PLATFORM_MIN_WIDTH || rect.height < config.PLATFORM_MIN_HEIGHT) {
          continue;
        }
        if (rect.bottom < -120 || rect.top > viewportH + 120) continue;
        if (rect.right < -120 || rect.left > viewportW + 120) continue;

        next.push({
          x: rect.left,
          y: rect.top,
          w: rect.width,
          h: rect.height,
          elementTag: (el.tagName || "UNKNOWN").toUpperCase(),
          selector: util.bestSelectorForElement(el),
          source: el
        });
      }

      next.push({
        x: 0,
        y: viewportH - 10,
        w: viewportW,
        h: 10,
        elementTag: "VIEWPORT_FLOOR",
        selector: "viewport-floor",
        source: null
      });

      state.platforms = next;
    }
  };
})(globalThis.DataMan);
