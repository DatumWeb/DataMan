/**
 * Snake eats actual page content.  When the snake head overlaps a
 * leaf-level DOM element that contains visible text, it consumes one
 * character.  The character disappears from the page visually.
 */
(function (DM) {
  const { state } = DM;

  const OVERLAY_ID = DM.config?.OVERLAY_ID || "dataman-overlay";
  /** Min ms between bites while overlapping text (lower = faster munch). */
  const COOLDOWN_MS = 120;
  const MAX_ELEMENT_AREA = 400 * 400;
  let lastEatMs = 0;

  /**
   * Returns leaf-level text elements — elements that contain text
   * directly and don't have large child subtrees full of text.
   * This prevents eating from giant wrapper divs like #application.
   */
  function leafTextElements() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const results = [];

    const els = document.querySelectorAll(
      "p, h1, h2, h3, h4, h5, h6, span, a, li, td, th, label, button, " +
      "strong, em, b, i, blockquote, figcaption, summary, dt, dd, caption, code, pre"
    );

    for (const el of els) {
      if (el.closest(`#${OVERLAY_ID}`)) continue;

      if (!hasOwnText(el)) continue;

      const rect = el.getBoundingClientRect();
      if (rect.width < 4 || rect.height < 4) continue;
      if (rect.width * rect.height > MAX_ELEMENT_AREA) continue;
      if (rect.bottom < 0 || rect.top > vh) continue;
      if (rect.right < 0 || rect.left > vw) continue;

      results.push({ el, rect });
    }
    return results;
  }

  /** True if the element has at least one direct text-node child with visible text. */
  function hasOwnText(el) {
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
        return true;
      }
    }
    return false;
  }

  /** Returns the first direct text-node child with content. */
  function firstDirectTextNode(el) {
    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE && child.textContent.trim().length > 0) {
        return child;
      }
    }
    return null;
  }

  function headOverlapsRect(headX, headY, cellSize, rect) {
    const hx2 = headX + cellSize;
    const hy2 = headY + cellSize;
    return headX < rect.right && hx2 > rect.left && headY < rect.bottom && hy2 > rect.top;
  }

  DM.snakeFood = {
    tryEat(headX, headY) {
      if (state.physics.physicsMode !== "snake") return null;

      const now = performance.now();
      if (now - lastEatMs < COOLDOWN_MS) return null;

      const cellSize = state.physics.snakeCellSize || 14;
      const targets = leafTextElements();

      for (const t of targets) {
        if (!headOverlapsRect(headX, headY, cellSize, t.rect)) continue;

        const textNode = firstDirectTextNode(t.el);
        if (!textNode) continue;

        const raw = textNode.textContent;
        if (!raw || raw.length === 0) continue;

        const ch = raw[0];
        textNode.textContent = raw.slice(1);

        lastEatMs = now;

        const tag = t.el.tagName || "UNKNOWN";
        const selector = DM.util?.bestSelectorForElement
          ? DM.util.bestSelectorForElement(t.el)
          : tag.toLowerCase();
        const preview = raw.trim().slice(0, 60);

        return { char: ch, elementTag: tag, selector, textPreview: preview };
      }
      return null;
    }
  };
})(globalThis.DataMan);
