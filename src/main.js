// App bootstrap + orchestration.
import "@arcgis/core/assets/esri/themes/dark/main.css";
import "./style.css";

import {
  bootScene,
  setActiveSplat,
  flyTo,
  whenCaptureReady,
  firstCapture
} from "./scene.js";
import { initGallery, setActiveCard } from "./gallery.js";
import { initTour, setCurrent as setTourCurrent, stop as stopTour, isPlaying, scheduleNext } from "./tour.js";
import { initTools, closeWidget } from "./tools.js";
import { applyAccent } from "./theme.js";
import { initHud } from "./hud.js";
import { initFx } from "./fx.js";
import { initCursor } from "./cursor.js";
import { initMinimap } from "./minimap.js";
import { initWeather } from "./weather.js";

let currentCapture = null;
let selecting = false;

const view = bootScene();

initGallery(selectCapture);
initTour(selectCapture);
initTools({ onReset });
initCursor();
const fx = initFx();
initHud(view);
const minimap = initMinimap();
const weather = initWeather(view);

view.when(async () => {
  setBoot("Loading reality mapping…");
  await selectCapture(firstCapture, { intro: true });
  hideBoot();
  fx.reveal(currentCapture, { intro: true });
});

async function selectCapture(capture, { fromTour = false, intro = false } = {}) {
  if (!capture || selecting) return;
  selecting = true;
  try {
    closeWidget();
    if (!fromTour) stopTour();

    currentCapture = capture;
    setActiveCard(capture.id);
    setTourCurrent(capture.id);
    applyAccent(capture);
    minimap.goTo(capture, { animate: !intro });
    weather.update(capture);
    if (!intro) fx.reveal(capture);

    setLoading(true, `Loading ${capture.title}…`);
    const layer = setActiveSplat(capture);
    flyTo(capture);
    await guard(whenCaptureReady(layer, { settleTimeout: intro ? 3000 : 9000 }));
  } finally {
    setLoading(false);
    selecting = false;
    if (isPlaying()) scheduleNext();
  }
}

// Reset re-frames the active capture rather than flying out to the globe.
function onReset() {
  stopTour();
  closeWidget();
  if (currentCapture) flyTo(currentCapture);
}

/* ---------- boot + loading UI ---------- */

function setBoot(msg) {
  const el = document.getElementById("bootStatus");
  if (el) el.textContent = msg;
}

function hideBoot() {
  const boot = document.getElementById("boot");
  if (!boot) return;
  boot.classList.add("is-hidden");
  setTimeout(() => boot.remove(), 700);
}

let pill;
function setLoading(on, msg = "") {
  if (document.getElementById("boot")) return; // initial boot overlay covers this
  if (!pill) {
    pill = document.createElement("div");
    pill.className = "loadpill";
    pill.innerHTML = `<span class="loadpill__spin"></span><span class="loadpill__msg"></span>`;
    document.body.appendChild(pill);
  }
  pill.querySelector(".loadpill__msg").textContent = msg;
  pill.classList.toggle("is-on", !!on);
}

// Never let the UI hang if a tileset stalls.
function guard(promise, ms = 25000) {
  return Promise.race([promise, new Promise((res) => setTimeout(res, ms))]).catch(() => {});
}
