// Scene engine: owns the SceneView, Gaussian Splat layers, glow and camera flights.
import EsriMap from "@arcgis/core/Map.js";
import SceneView from "@arcgis/core/views/SceneView.js";
import GaussianSplatLayer from "@arcgis/core/layers/GaussianSplatLayer.js";
import ElevationLayer from "@arcgis/core/layers/ElevationLayer.js";
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import Camera from "@arcgis/core/Camera.js";
import Point from "@arcgis/core/geometry/Point.js";
import Glow from "@arcgis/core/webscene/Glow.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { SCENE_GLOW, FLY_MS, CAPTURES, ELEVATION_OFFSETS, BUILDING_E_TERRAIN_URL, ALCATRAZ_WATER_URL } from "./config.js";

let view;
const splatCache = new Map(); // capture.id -> GaussianSplatLayer

export function makeCamera(c) {
  return new Camera({
    position: new Point({ x: c.x, y: c.y, z: c.z, spatialReference: { wkid: 102100 } }),
    heading: c.heading,
    tilt: c.tilt
  });
}

export function getView() {
  return view;
}

export function bootScene() {
  const map = new EsriMap({ basemap: "satellite", ground: "world-elevation" });

  view = new SceneView({
    container: "viewDiv",
    map,
    camera: makeCamera(CAPTURES[0].camera),
    qualityProfile: "high",
    popupEnabled: false,
    environment: {
      lighting: { type: "sun", directShadowsEnabled: true },
      atmosphere: { quality: "high" },
      starsEnabled: true
    },
    ui: { components: [] }
  });

  // Enable the glow once the view's DOM is ready. (Adding UI components here crashes
  // DefaultUI3D in this build; the required Esri attribution renders on its own.)
  view.when(() => enableGlow());
  return view;
}

function enableGlow() {
  const lighting = view?.environment?.lighting;
  if (lighting) {
    lighting.glow = new Glow({ intensity: Math.min(Math.max(SCENE_GLOW, 0), 1) });
  }
}

function getSplat(capture) {
  let layer = splatCache.get(capture.id);
  if (!layer) {
    layer = new GaussianSplatLayer({
      url: capture.url,
      title: capture.title,
      id: `splat-${capture.id}`
    });
    const offset = ELEVATION_OFFSETS[capture.id];
    // Lift georeferenced splats by the source scene's offset so they don't sink into the terrain.
    if (offset != null) layer.elevationInfo = { mode: "absolute-height", offset };
    splatCache.set(capture.id, layer);
  }
  return layer;
}

// Ensure `capture`'s splat is on the map; unload others (except `keepIds`) to bound memory.
export function setActiveSplat(capture, { keepIds = [] } = {}) {
  const keep = new Set([capture.id, ...keepIds]);
  for (const [id, layer] of splatCache) {
    const onMap = view.map.layers.includes(layer);
    if (!keep.has(id) && onMap) view.map.remove(layer);
  }
  const layer = getSplat(capture);
  if (!view.map.layers.includes(layer)) view.map.add(layer, 0);
  layer.visible = true;
  applySceneExtras(capture);
  return layer;
}

// The source web scene adds two capture-specific layers: a pre-construction terrain for
// Building E 2019 and the Alcatraz water body. Created lazily; hidden until their capture is active.
let customTerrain, alcatrazWater;
function ensureExtras() {
  if (!customTerrain) {
    customTerrain = new ElevationLayer({ url: BUILDING_E_TERRAIN_URL, visible: false });
    view.map.ground.layers.add(customTerrain);
  }
  if (!alcatrazWater) {
    alcatrazWater = new FeatureLayer({
      url: ALCATRAZ_WATER_URL,
      visible: false,
      elevationInfo: { mode: "on-the-ground" },
      renderer: {
        type: "simple",
        symbol: {
          type: "polygon-3d",
          symbolLayers: [{
            type: "water", color: [28, 60, 74],
            waterbodySize: "large", waveDirection: 24, waveStrength: "rippled"
          }]
        }
      }
    });
    view.map.add(alcatrazWater);
  }
}
function applySceneExtras(capture) {
  ensureExtras();
  customTerrain.visible = capture.id === "building-2019";
  alcatrazWater.visible = capture.id === "alcatraz";
}

// Resolve once the capture's tiles have settled, or after `settleTimeout` ms so a large
// tileset keeps streaming behind the UI instead of holding the loading screen open.
export async function whenCaptureReady(layer, { settleTimeout = 9000 } = {}) {
  const settled = view.whenLayerView(layer).then(async (lv) => {
    await reactiveUtils.whenOnce(() => !lv.updating);
    return lv;
  });
  return Promise.race([
    settled,
    new Promise((resolve) => setTimeout(resolve, settleTimeout))
  ]);
}

export function flyTo(target, opts = {}) {
  const cam = target instanceof Camera ? target : makeCamera(target.camera ?? target);
  return view.goTo(cam, { duration: opts.duration ?? FLY_MS, easing: opts.easing ?? "in-out-cubic" })
    .catch(() => {}); // goTo rejects if interrupted — safe to ignore
}

export const firstCapture = CAPTURES[0];
