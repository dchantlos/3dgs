// Renders the drone in third person as a single glTF — the body with translucent
// rotor-blur discs baked in at each hub — so the discs are rigid geometry on the
// model and there is nothing to position per frame.
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";

const BASE = import.meta.env.BASE_URL;
const MODEL_URL = `${BASE}drone.glb`;

// Tunables ---------------------------------------------------------------
const DRONE_W_M = 1.4;       // rendered drone width in metres
let HEADING_OFFSET = 270;    // TEMP calibration — press [ / ] in drone mode to aim the sensor forward
// -----------------------------------------------------------------------

function objectSymbol(href, widthM) {
  return {
    type: "point-3d",
    symbolLayers: [{
      type: "object",
      resource: { href },
      width: widthM,
      anchor: "origin",
      heading: 0
    }]
  };
}

export function initDrone(view) {
  const layer = new GraphicsLayer({ elevationInfo: { mode: "absolute-height" }, visible: false });
  view.map.add(layer);

  const model = new Graphic({ symbol: objectSymbol(MODEL_URL, DRONE_W_M) });
  layer.add(model);

  const pt = (x, y, z) => new Point({ x, y, z, spatialReference: { wkid: 102100 } });

  function setPose(s, lean) {
    model.geometry = pt(s.x, s.y, s.z);
    // Mutate the object layer in place — reassigning the whole glTF symbol each frame
    // makes the SDK reprocess the model resource and leaks GPU memory fast.
    const layer = model.symbol.symbolLayers.getItemAt(0);
    layer.heading = s.heading + HEADING_OFFSET;
    layer.tilt = lean?.pitch || 0;   // nose-down when moving forward
    layer.roll = lean?.roll || 0;    // bank into strafe / turn
  }

  return {
    setPose,
    show() { layer.visible = true; },
    hide() { layer.visible = false; },
    isDroneGraphic: (g) => g === model,
    getHeadingOffset: () => HEADING_OFFSET,
    bumpHeadingOffset(delta) { HEADING_OFFSET = (HEADING_OFFSET + delta + 360) % 360; return HEADING_OFFSET; },
    destroy() { view.map.remove(layer); }
  };
}
