(function (DM) {
  DM.skins = DM.skins || {};

  DM.skins.draw = function draw(skin, tSec) {
    if (skin === "astroman" && DM.skins.astroman?.draw) {
      DM.skins.astroman.draw(tSec);
      return;
    }

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

