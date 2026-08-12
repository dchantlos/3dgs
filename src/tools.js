// Reality-inspection toolkit: slice, line of sight, elevation profile, measure, reset.
// Splat analysis support is new in SDK 5.1.
import Slice from "@arcgis/core/widgets/Slice.js";
import LineOfSight from "@arcgis/core/widgets/LineOfSight.js";
import ElevationProfile from "@arcgis/core/widgets/ElevationProfile.js";
import DirectLineMeasurement3D from "@arcgis/core/widgets/DirectLineMeasurement3D.js";
import { getView } from "./scene.js";

const TOOL_META = {
  slice: { title: "Slice", hint: "Drag the handles to cut through the capture." },
  los: { title: "Line of sight", hint: "Click to place an observer, then a target." },
  elevation: { title: "Elevation profile", hint: "Draw a line to profile the surface." },
  measure: { title: "Measure", hint: "Click two points to measure a 3D distance." }
};
const WIDGET_TOOLS = new Set(Object.keys(TOOL_META));

let active = null; // name of the open widget tool
let widget = null; // the live widget instance
let panel = null; // its panel element
let cb = {};

export function initTools(callbacks = {}) {
  cb = callbacks;
  document.querySelectorAll("#toolsDock .dock__btn").forEach((btn) => {
    btn.addEventListener("click", () => handle(btn.dataset.tool));
  });
}

function handle(tool) {
  if (WIDGET_TOOLS.has(tool)) return toggleWidget(tool);
  if (tool === "reset") {
    closeWidget();
    cb.onReset?.();
  }
}

function toggleWidget(name) {
  if (active === name) return closeWidget();
  closeWidget();

  const meta = TOOL_META[name];
  panel = document.createElement("div");
  panel.className = "toolpanel";
  panel.innerHTML = `
    <div class="toolpanel__head">
      <strong>${meta.title}</strong>
      <button class="toolpanel__close" aria-label="Close tool">×</button>
    </div>
    <p class="toolpanel__hint">${meta.hint}</p>
    <div class="toolpanel__widget"></div>`;
  document.getElementById("toolPanels").appendChild(panel);
  panel.querySelector(".toolpanel__close").addEventListener("click", closeWidget);

  const container = panel.querySelector(".toolpanel__widget");
  widget = makeWidget(name, container);

  active = name;
  document.body.classList.add("tool-active");
  markDock(name, true);
}

function makeWidget(name, container) {
  const view = getView();
  switch (name) {
    case "slice":
      return new Slice({ view, container });
    case "los":
      return new LineOfSight({ view, container });
    case "elevation":
      return new ElevationProfile({ view, container });
    case "measure":
      return new DirectLineMeasurement3D({ view, container });
    default:
      return null;
  }
}

export function closeWidget() {
  if (widget) {
    widget.destroy();
    widget = null;
  }
  if (panel) {
    panel.remove();
    panel = null;
  }
  if (active) markDock(active, false);
  active = null;
  document.body.classList.remove("tool-active");
}

function markDock(name, on) {
  document.querySelector(`#toolsDock [data-tool="${name}"]`)?.classList.toggle("is-on", on);
}
