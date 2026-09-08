// Renders the drone in third person as a single glTF — the body with translucent
// rotor-blur discs baked in at each hub — so the discs are rigid geometry on the
// model and there is nothing to position per frame.
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer.js";
import Graphic from "@arcgis/core/Graphic.js";
import Point from "@arcgis/core/geometry/Point.js";
import PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D.js";
import ObjectSymbol3DLayer from "@arcgis/core/symbols/ObjectSymbol3DLayer.js";

const BASE = import.meta.env.BASE_URL;
const MODEL_URL = `${BASE}drone.glb`;

// Tunables ---------------------------------------------------------------
const DRONE_W_M = 1.4;       // rendered drone width in metres
const HEADING_OFFSET = 180;  // aligns the model's sensor with the flight direction in third person
const ORIENT_MIN_MS = 45;    // min gap between orientation symbol-swaps (throttles the costly repaint on heavy scenes)
// -----------------------------------------------------------------------

export function initDrone(view) {
  const layer = new GraphicsLayer({ elevationInfo: { mode: "absolute-height" }, visible: false });
  view.map.add(layer);

  // Pre-build the symbol once. Re-orienting is done by cloning this pristine symbol and reassigning
  // model.symbol — the only thing that makes the SceneView repaint the glTF's heading (an in-place
  // layer.heading change never repaints, so the drone would freeze at its last-drawn heading).
  // Cloning the ORIGINAL reuses the cached model resource, so it doesn't reload the 3.6 MB glTF —
  // the same approach the Sky Tour plane uses to rotate its model.
  const baseSymbol = new PointSymbol3D({
    symbolLayers: [new ObjectSymbol3DLayer({ resource: { href: MODEL_URL }, width: DRONE_W_M, anchor: "origin", heading: 0 })]
  });

  const model = new Graphic({ symbol: baseSymbol.clone() });
  layer.add(model);

  const pt = (x, y, z) => new Point({ x, y, z, spatialReference: { wkid: 102100 } });

  let lastOrient = "";
  let lastSwap = 0;
  function setPose(s, lean) {
    model.geometry = pt(s.x, s.y, s.z); // every frame: keep the drone locked under the chase camera
    const heading = s.heading + HEADING_OFFSET;
    const tilt = lean?.pitch || 0;   // nose-down when moving forward
    const roll = lean?.roll || 0;    // bank into strafe / turn
    const orient = `${Math.round(heading)} ${Math.round(tilt)} ${Math.round(roll)}`;
    if (orient === lastOrient) return; // orientation unchanged (e.g. hover) — no swap needed
    // The symbol swap re-renders the glTF and is the expensive bit; throttle it so a heavy splat
    // scene isn't hit with a swap every frame while the drone turns and leans.
    const now = performance.now();
    if (now - lastSwap < ORIENT_MIN_MS) return;
    lastOrient = orient;
    lastSwap = now;
    const sym = baseSymbol.clone();
    const objLayer = sym.symbolLayers.getItemAt(0);
    objLayer.heading = heading;
    objLayer.tilt = tilt;
    objLayer.roll = roll;
    model.symbol = sym;
  }

  return {
    setPose,
    show() { layer.visible = true; },
    hide() { layer.visible = false; },
    isDroneGraphic: (g) => g === model,
    destroy() { view.map.remove(layer); }
  };
}
