// Scene engine: owns the SceneView, Gaussian Splat layers, glow and camera flights.
import EsriMap from "@arcgis/core/Map.js";
import SceneView from "@arcgis/core/views/SceneView.js";
import GaussianSplatLayer from "@arcgis/core/layers/GaussianSplatLayer.js";
import Camera from "@arcgis/core/Camera.js";
import Point from "@arcgis/core/geometry/Point.js";
import Glow from "@arcgis/core/webscene/Glow.js";
import * as reactiveUtils from "@arcgis/core/core/reactiveUtils.js";
import { SCENE_GLOW, FLY_MS, CAPTURES } from "./config.js";

let view;
const splatCache = new Map(); // capture.id -> GaussianSplatLayer

// High-altitude opening shot so the first selection reads as a descent from space.
const INTRO_CAMERA = new Camera({
  position: new Point({ x: -10800000, y: 4600000, z: 9_500_000, spatialReference: { wkid: 102100 } }),
  heading: 0,
  tilt: 20
});

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
    camera: INTRO_CAMERA,
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
  return layer;
}

// Resolve once the capture's tiles have finished their first draw.
export async function whenCaptureReady(layer) {
  const lv = await view.whenLayerView(layer);
  await reactiveUtils.whenOnce(() => !lv.updating);
  return lv;
}

export function flyTo(target, opts = {}) {
  const cam = target instanceof Camera ? target : makeCamera(target.camera ?? target);
  return view.goTo(cam, { duration: opts.duration ?? FLY_MS, easing: opts.easing ?? "in-out-cubic" })
    .catch(() => {}); // goTo rejects if interrupted — safe to ignore
}

export const firstCapture = CAPTURES[0];
