(function (DM) {
  DM.skins = DM.skins || {};

  DM.skins.draw = function draw(skin, tSec) {
    // Default fallback: basic geometric avatar.
    if (skin === "stickman" && DM.skins.stickman?.draw) {
      DM.skins.stickman.draw(tSec);
      return;
    }

    if (DM.skins.basic?.draw) {
      DM.skins.basic.draw(tSec);
      return;
    }
  };
})(globalThis.DataMan);

