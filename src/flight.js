// Drone mode: pilot a free first-person camera through the active splat with
// keyboard + mouse. Desktop only — the app's mobile mode never exposes this.
import * as webMercatorUtils from "@arcgis/core/geometry/support/webMercatorUtils.js";
import { getView, makeCamera } from "./scene.js";
import { closeWidget } from "./tools.js";
import { initDrone } from "./drone.js";
import { el, clamp, mercToLonLat } from "./util.js";

const DEG = Math.PI / 180;
const TAU = 0.32;        // velocity easing time constant — small coast, quick stop
const YAW_RATE = 75;     // deg/sec for Q/E + arrow turning
const PITCH_RATE = 60;   // deg/sec for arrow pitch
const LOOK_SENS = 0.12;  // deg per pixel of mouse movement
const CRUISE_DEFAULT = 28; // m/s starting speed
const CRUISE_MIN = 10;
const CRUISE_MAX = 1500;
const CHASE_BACK = 18;   // metres the third-person camera trails the drone
const CHASE_UP = 7;      // metres above the drone
const RENDER_TAU = 0.06; // smoothing (s) for the shared drone+camera render pose
const MAX_LEAN = 24;         // max degrees the drone tips toward its control input
const LEAN_TAU = 0.14;       // how quickly the drone tips in / levels out (seconds)
const LEAN_PITCH_SIGN = -1;  // forward motion pitches the nose down
const LEAN_ROLL_SIGN = 1;    // strafing / turning banks the drone
const KEYS = new Set(["w", "a", "s", "d", "q", "e", "i", "k", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

let cb = {};
let flyBtn = null;
let ui = null;
let info = null;
let view = null;
let drone = null;

let active = false;
let locked = false;
let lookHeld = false;   // right mouse button held → mouse-look is engaged
let freeLook = false;   // X toggles the old always-on free-look (pointer stays captured)
let infoOpen = false;
let pendingStart = false;
let thirdPerson = true;
let rafId = 0;
let lastT = 0;
let cruise = CRUISE_DEFAULT;             // m/s target speed (mouse wheel adjusts)
const keys = new Set();
const vel = { x: 0, y: 0, z: 0 };        // true metres/sec (east, north, up)
const st = { x: 0, y: 0, z: 0, heading: 0, tilt: 80 }; // x/y = web-mercator metres
const render = { x: 0, y: 0, z: 0, heading: 0, tilt: 80, ready: false }; // smoothed pose the drone + camera share
const lean = { pitch: 0, roll: 0 };      // eased visual tilt applied to the drone model
let handles = [];
let telT = 0;

// The flight feature is gated to desktop, matching the app's existing 860px
// mobile breakpoint (the same one that hides the globe, weather panel, etc.).
function isDesktop() {
  return window.matchMedia("(min-width: 861px)").matches;
}

export function initFlight(_view, callbacks = {}) {
  cb = callbacks;
  flyBtn = document.getElementById("flyBtn");
  if (!flyBtn) return { exit() {}, isActive: () => false };

  buildUi();
  buildInfo();
  drone = initDrone(getView());
  flyBtn.addEventListener("click", toggle);
  window.addEventListener("keydown", onGlobalKey); // Esc closes the panel / exits, always available
  // Choosing any other dock tool drops out of drone mode.
  document.querySelectorAll("#toolsDock .dock__btn").forEach((b) => {
    if (b.id !== "flyBtn") b.addEventListener("click", () => { if (active) exit(); });
  });
  return { exit, isActive: () => active };
}

function toggle() {
  if (active) exit();
  else openInfo(true); // show the instructions first; the user confirms to start
}

function enter() {
  if (active || !isDesktop()) return;
  view = getView();
  if (!view) return;

  closeWidget();
  cb.onEnter?.();
  setFlightPerf(true);

  // Seed flight state from wherever the camera currently is.
  const cam = view.camera;
  const p = cam.position;
  let mx, my;
  if (p.spatialReference?.isGeographic) {
    const wm = webMercatorUtils.geographicToWebMercator(p);
    mx = wm.x; my = wm.y;
  } else {
    mx = p.x; my = p.y;
  }
  // Enter in first person: seed the flight state at the current camera so the
  // cockpit view starts exactly where the user was looking — no snap.
  st.x = mx;
  st.y = my;
  st.z = p.z ?? 200;
  st.heading = cam.heading || 0;
  st.tilt = clamp(cam.tilt || 80, 1, 179);
  vel.x = vel.y = vel.z = 0;
  lean.pitch = lean.roll = 0;
  cruise = CRUISE_DEFAULT;
  render.ready = false;

  active = true;
  freeLook = false;                  // start in hold-to-look; press X for continuous free-look
  thirdPerson = false;               // default to the first-person cockpit view
  document.body.classList.add("flight-active");
  flyBtn.classList.add("is-on");
  drone.hide();                      // no chase model in first person
  updateViewBtn();
  updateLookHint();
  addListeners();
  // Already sitting at the drone's eye — cut straight in and run the sim. The view only
  // turns while the right mouse button is held, so the cursor stays free to click.
  view.camera = makeCamera(st);
  lastT = performance.now();
  rafId = requestAnimationFrame(tick);
  paintTelemetry(true);
}

function exit() {
  if (!active) return;
  active = false;
  setFlightPerf(false);
  cancelAnimationFrame(rafId);
  rafId = 0;
  removeListeners();
  closeInfo();
  drone?.hide();
  if (document.pointerLockElement) document.exitPointerLock();
  document.body.classList.remove("flight-active");
  ui?.classList.remove("is-unlocked");
  flyBtn?.classList.remove("is-on");
  cb.onExit?.();
}

/* ---------- per-frame simulation ---------- */

function tick(now) {
  const dt = Math.min((now - lastT) / 1000, 0.05); // clamp to avoid jumps after stalls
  lastT = now;
  if (!infoOpen) step(dt);
  paintTelemetry();
  rafId = requestAnimationFrame(tick);
}

function step(dt) {
  const hRad = st.heading * DEG;
  const sinH = Math.sin(hRad), cosH = Math.cos(hRad);

  const fwd = (keys.has("w") ? 1 : 0) - (keys.has("s") ? 1 : 0);
  const strafe = (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0);
  const lift = (keys.has("i") ? 1 : 0) - (keys.has("k") ? 1 : 0);
  let ix, iy, iz;
  if (thirdPerson) {
    // Drone chase view: forward/strafe stay horizontal; I/K change altitude.
    ix = sinH * fwd + cosH * strafe;
    iy = cosH * fwd - sinH * strafe;
    iz = lift;
  } else {
    // First person: fly where you look (forward follows the view pitch).
    const pitch = (st.tilt - 90) * DEG;
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    ix = sinH * cosP * fwd + cosH * strafe;
    iy = cosH * cosP * fwd - sinH * strafe;
    iz = sinP * fwd + lift;
  }

  const mag = Math.hypot(ix, iy, iz);
  let tvx = 0, tvy = 0, tvz = 0;
  if (mag > 1e-4) {
    tvx = (ix / mag) * cruise;
    tvy = (iy / mag) * cruise;
    tvz = (iz / mag) * cruise;
  }
  const k = 1 - Math.exp(-dt / TAU);
  vel.x += (tvx - vel.x) * k;
  vel.y += (tvy - vel.y) * k;
  vel.z += (tvz - vel.z) * k;

  // Keyboard turning / pitch (mouse handles this too when pointer is locked).
  const yaw = ((keys.has("e") || keys.has("arrowright")) ? 1 : 0) -
              ((keys.has("q") || keys.has("arrowleft")) ? 1 : 0);
  if (yaw) st.heading = (st.heading + yaw * YAW_RATE * dt + 360) % 360;
  const pitchK = (keys.has("arrowup") ? 1 : 0) - (keys.has("arrowdown") ? 1 : 0);
  if (pitchK) st.tilt = clamp(st.tilt + pitchK * PITCH_RATE * dt, 1, 179);

  // Web Mercator stretches horizontal distance by 1/cos(lat); scale so the felt
  // speed is uniform. Altitude (z) is already true metres.
  const latRad = mercToLonLat(0, st.y).lat * DEG;
  const sc = 1 / Math.max(Math.cos(latRad), 0.01);
  st.x += vel.x * dt * sc;
  st.y += vel.y * dt * sc;
  st.z = clamp(st.z + vel.z * dt, -1000, 5_000_000);

  // Tip the drone toward its control input (nose-down on W, bank on strafe/turn),
  // eased so it leans in and levels out smoothly.
  const kLean = 1 - Math.exp(-dt / LEAN_TAU);
  lean.pitch += (clamp(fwd, -1, 1) * MAX_LEAN * LEAN_PITCH_SIGN - lean.pitch) * kLean;
  lean.roll += (clamp(strafe + yaw * 0.5, -1, 1) * MAX_LEAN * LEAN_ROLL_SIGN - lean.roll) * kLean;

  if (thirdPerson) {
    easeRender(dt);
    drone.setPose(render, lean);
    view.camera = chaseCamera(render);
  } else {
    view.camera = makeCamera(st);
  }
}

// Ease the shared render pose toward the true flight state. The drone and the
// chase camera are both drawn from this smoothed pose, so the model stays locked
// to screen centre while frame-time jitter is filtered out.
function easeRender(dt) {
  if (!render.ready) {
    render.x = st.x; render.y = st.y; render.z = st.z;
    render.heading = st.heading; render.tilt = st.tilt;
    render.ready = true;
    return;
  }
  const k = 1 - Math.exp(-dt / RENDER_TAU);
  render.x += (st.x - render.x) * k;
  render.y += (st.y - render.y) * k;
  render.z += (st.z - render.z) * k;
  const dh = ((st.heading - render.heading + 540) % 360) - 180; // shortest turn
  render.heading = (render.heading + dh * k + 360) % 360;
  render.tilt += (st.tilt - render.tilt) * k;
}

// A quadcopter tips toward its direction of travel. Derive a small pitch/roll from
// the (already-eased) velocity so the drone leans in smoothly and levels when it stops.
function droneLean() {
  const H = render.heading * DEG;
  const sH = Math.sin(H), cH = Math.cos(H);
  const fwd = vel.x * sH + vel.y * cH;     // speed along heading
  const right = vel.x * cH - vel.y * sH;   // speed to the right
  const denom = Math.max(cruise, 1);
  return {
    pitch: clamp((fwd / denom) * MAX_LEAN, -MAX_LEAN, MAX_LEAN) * LEAN_PITCH_SIGN,
    roll: clamp((right / denom) * MAX_LEAN, -MAX_LEAN, MAX_LEAN) * LEAN_ROLL_SIGN
  };
}

// Third-person chase camera: trails behind + above the drone, looking at it.
function chaseCamera(s) {
  const H = s.heading * DEG;
  const invcos = 1 / Math.max(Math.cos(mercToLonLat(0, s.y).lat * DEG), 0.01);
  const camX = s.x - Math.sin(H) * CHASE_BACK * invcos;
  const camY = s.y - Math.cos(H) * CHASE_BACK * invcos;
  const downDeg = Math.atan2(CHASE_UP, CHASE_BACK) / DEG;
  return makeCamera({ x: camX, y: camY, z: s.z + CHASE_UP, heading: s.heading, tilt: 90 - downDeg });
}

// Gaussian-splat rendering is GPU-heavy; real-time shadows, high atmosphere and stars
// on top of it make a moving camera stutter. Drop them (and the quality profile) while
// flying and restore on exit — the same trick that keeps the Sky Tour flight fluid.
let savedQuality = null;
function setFlightPerf(on) {
  if (!view) return;
  const env = view.environment;
  if (on) {
    if (savedQuality) return;
    savedQuality = {
      shadows: env?.lighting?.directShadowsEnabled,
      atmosphere: env?.atmosphere?.quality,
      stars: env?.starsEnabled
    };
    try {
      // Real-time shadows are the biggest per-frame cost over a splat; drop the heaviest
      // environment effects while flying. The quality profile is left alone so there is no
      // splat re-tessellation hitch when entering or leaving drone mode.
      if (env?.lighting) env.lighting.directShadowsEnabled = false;
      if (env?.atmosphere) env.atmosphere.quality = "low";
      if (env) env.starsEnabled = false;
    } catch { /* environment shape varies by SDK build */ }
  } else {
    if (!savedQuality) return;
    try {
      if (env?.lighting && savedQuality.shadows != null) env.lighting.directShadowsEnabled = savedQuality.shadows;
      if (env?.atmosphere && savedQuality.atmosphere != null) env.atmosphere.quality = savedQuality.atmosphere;
      if (env && savedQuality.stars != null) env.starsEnabled = savedQuality.stars;
    } catch { /* ignore */ }
    savedQuality = null;
  }
}

function setView(third) {
  thirdPerson = third;
  lookHeld = false;
  if (third) {
    render.ready = false;
    drone.show();
    if (document.pointerLockElement) document.exitPointerLock();
  } else {
    drone.hide(); // first person: hold the right mouse button (or press X for free-look)
    if (freeLook) requestLock();
  }
  ui?.classList.toggle("is-unlocked", !third && !locked);
  updateViewBtn();
  updateLookHint();
}

function toggleView() { if (active) setView(!thirdPerson); }

function updateViewBtn() {
  const b = ui?.querySelector(".flighthud__view");
  if (b) b.textContent = thirdPerson ? "3rd" : "1st";
}

function updateLookHint() {
  const span = ui?.querySelector(".flighthud__lock span");
  if (!span) return;
  span.innerHTML = freeLook
    ? `Free-look on · <kbd>X</kbd> to hold-to-look · <kbd>Esc</kbd> to exit`
    : `Hold the <kbd>right mouse button</kbd> to look · <kbd>X</kbd> free-look · <kbd>Esc</kbd> to exit`;
}

/* ---------- input ---------- */

function addListeners() {
  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("wheel", onWheel, { passive: false });
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("mousedown", onMouseDown);
  document.addEventListener("mouseup", onMouseUp);
  document.addEventListener("contextmenu", onContextMenu);
  document.addEventListener("pointerlockchange", onLockChange);
  const stop = (e) => e.stopPropagation();
  handles = [
    view.on("drag", stop),
    view.on("mouse-wheel", stop),
    view.on("double-click", stop),
    view.on("key-down", stop),
    view.on("key-up", stop),
    view.on("click", onSceneClick)
  ];
}

function removeListeners() {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  window.removeEventListener("wheel", onWheel);
  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("mousedown", onMouseDown);
  document.removeEventListener("mouseup", onMouseUp);
  document.removeEventListener("contextmenu", onContextMenu);
  document.removeEventListener("pointerlockchange", onLockChange);
  handles.forEach((h) => h.remove());
  handles = [];
  keys.clear();
}

function onKeyDown(e) {
  if (infoOpen) return; // the panel is open; ignore flight keys
  const k = e.key.toLowerCase();
  if (k === "v") { toggleView(); return; } // 1st ⇄ 3rd person
  if (k === "x") { toggleFreeLook(); return; } // continuous free-look ⇄ hold-to-look
  if (import.meta.env.DEV && (k === "[" || k === "]")) { // DEV-only: dial the drone facing until the sensor points forward
    const v = drone.bumpHeadingOffset(k === "]" ? 15 : -15);
    const cal = ui && ui.querySelector(".flighthud__cal");
    if (cal) cal.textContent = `facing offset ${v}° — press [ / ] to aim the sensor forward`;
    console.log("[drone] HEADING_OFFSET =", v);
    return;
  }
  if (KEYS.has(k)) { e.preventDefault(); keys.add(k); }
}

// Esc handled globally so it works in the pre-flight panel and mid-flight alike.
function onGlobalKey(e) {
  if (e.key !== "Escape") return;
  if (infoOpen) closeInfo();
  else if (active && !locked) exit(); // 1st Esc frees the cursor, 2nd exits
}

function onKeyUp(e) {
  keys.delete(e.key.toLowerCase());
}

function onMouseMove(e) {
  if (!locked) return;
  st.heading = (st.heading + e.movementX * LOOK_SENS + 360) % 360;
  st.tilt = clamp(st.tilt - e.movementY * LOOK_SENS, 1, 179);
}

// Hold the right mouse button to look: grab the pointer on right-down, release it on
// right-up. While unheld the cursor is free, so the user can click the HUD or the scene.
// (In free-look mode the pointer stays captured, so the right button isn't needed.)
function onMouseDown(e) {
  if (!active || infoOpen || thirdPerson || freeLook || e.button !== 2) return;
  e.preventDefault();
  lookHeld = true;
  requestLock();
}

function onMouseUp(e) {
  if (e.button !== 2 || freeLook) return;
  lookHeld = false;
  if (document.pointerLockElement) document.exitPointerLock();
}

function onContextMenu(e) {
  if (active && !thirdPerson) e.preventDefault(); // right-drag drives the view; suppress the browser menu
}

// X toggles the old always-on free-look (continuous mouse-look) vs. hold-right-to-look.
function toggleFreeLook() {
  if (!active || thirdPerson) return;
  freeLook = !freeLook;
  lookHeld = false;
  if (freeLook) requestLock();
  else if (document.pointerLockElement) document.exitPointerLock();
  updateLookHint();
}

function onWheel(e) {
  e.preventDefault();
  cruise = clamp(cruise * Math.exp(-e.deltaY * 0.0012), CRUISE_MIN, CRUISE_MAX);
  paintTelemetry(true);
}

function requestLock() {
  try {
    const r = view.container?.requestPointerLock?.();
    if (r && typeof r.catch === "function") r.catch(() => {});
  } catch {
    /* pointer lock needs a trusted gesture / secure context; keyboard flight still works */
  }
}

function onLockChange() {
  locked = document.pointerLockElement === view.container;
  // Hold-to-look: if the button was released before the async lock engaged, let go.
  if (locked && !lookHeld && !freeLook) { document.exitPointerLock(); return; }
  ui?.classList.toggle("is-unlocked", active && !thirdPerson && !locked);
}

function onSceneClick(e) {
  if (!active) return;
  // Third person: click the drone to drop into the cockpit. First person hold-to-look: clicks
  // stay free. First person free-look: click re-captures the pointer after Esc frees it.
  if (thirdPerson) {
    view.hitTest(e).then((r) => {
      if (r.results.some((x) => drone.isDroneGraphic(x.graphic))) setView(false);
    }).catch(() => {});
  } else if (freeLook && !locked) {
    requestLock();
  }
}

/* ---------- HUD ---------- */

function buildUi() {
  ui = el("div", "flighthud");
  ui.innerHTML = `
    <div class="flighthud__bar">
      <span class="flighthud__badge"><svg class="flighthud__badgeico" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="6" r="2.4"/><circle cx="18" cy="6" r="2.4"/><circle cx="6" cy="18" r="2.4"/><circle cx="18" cy="18" r="2.4"/><path d="M7.7 7.7l2.6 2.6M16.3 7.7l-2.6 2.6M7.7 16.3l2.6-2.6M16.3 16.3l-2.6-2.6"/><rect x="9.5" y="9.5" width="5" height="5" rx="1.2"/></svg>DRONE</span>
      <span class="flighthud__stat"><i>SPD</i><b id="flSpd">0</b><u>m/s</u></span>
      <span class="flighthud__stat"><i>ALT</i><b id="flAlt">0</b><u>m</u></span>
      <span class="flighthud__stat"><i>HDG</i><b id="flHdg">0</b><u>°</u></span>
      <button class="flighthud__view" type="button" title="Toggle 1st / 3rd person (V)">3rd</button>
      <button class="flighthud__info" type="button" title="Drone controls" aria-label="Drone controls"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/></svg></button>
      <button class="flighthud__exit" type="button">Exit ✕</button>
    </div>
    <div class="flighthud__keys">
      <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> move</span>
      <span><kbd>I</kbd> / <kbd>K</kbd> up · down</span>
      <span><kbd>Q</kbd><kbd>E</kbd> turn · scroll speed</span>
      <span><kbd>V</kbd> / click drone: 1st ⇄ 3rd</span>
    </div>
    ${import.meta.env.DEV ? '<div class="flighthud__cal" style="text-align:center;font-size:12px;color:#7fe9ff;padding:4px 0 2px;letter-spacing:.02em;">facing offset 270° — press [ / ] to aim the sensor forward</div>' : ''}
    <div class="flighthud__lock"><span>Hold the <kbd>right mouse button</kbd> to look · <kbd>X</kbd> free-look · <kbd>Esc</kbd> to exit</span></div>`;
  document.body.appendChild(ui);
  ui.querySelector(".flighthud__exit").addEventListener("click", exit);
  ui.querySelector(".flighthud__view").addEventListener("click", toggleView);
  ui.querySelector(".flighthud__info").addEventListener("click", () => openInfo(false));
  if (import.meta.env.DEV) {
    const cal = ui.querySelector(".flighthud__cal");
    if (cal && drone) cal.textContent = `facing offset ${drone.getHeadingOffset()}° — press [ / ] to aim the sensor forward`;
  }
}

function paintTelemetry(force) {
  const now = performance.now();
  if (!force && now - telT < 100) return; // ~10 Hz
  telT = now;
  const spd = ui.querySelector("#flSpd");
  const alt = ui.querySelector("#flAlt");
  const hdg = ui.querySelector("#flHdg");
  if (spd) spd.textContent = Math.round(Math.hypot(vel.x, vel.y, vel.z));
  if (alt) alt.textContent = Math.round(st.z).toLocaleString();
  if (hdg) hdg.textContent = Math.round(st.heading);
}

/* ---------- info & sources ---------- */

function buildInfo() {
  info = el("div", "flightinfo");
  info.setAttribute("role", "dialog");
  info.setAttribute("aria-modal", "true");
  info.setAttribute("aria-label", "Drone mode controls");
  info.innerHTML = `
    <div class="flightinfo__backdrop"></div>
    <div class="flightinfo__panel">
      <div class="flightinfo__head">
        <strong class="flightinfo__title">Info &amp; sources</strong>
        <button class="flightinfo__close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="flightinfo__body">
        <h4>Drone controls</h4>
        <ul class="flightinfo__list">
          <li><b>Move:</b> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> fly forward, left, back and right.</li>
          <li><b>View:</b> starts in first person (cockpit) &mdash; press <kbd>V</kbd> to switch to third person and back.</li>
          <li><b>Look (first person):</b> hold the <b>right mouse button</b> and move the mouse to aim. Release it to free the cursor for clicking.</li>
          <li><b>Free-look:</b> press <kbd>X</kbd> to toggle continuous mouse-look (no need to hold the right button).</li>
          <li><b>Climb / descend:</b> <kbd>I</kbd> rises, <kbd>K</kbd> drops.</li>
          <li><b>Turn / pitch:</b> <kbd>Q</kbd><kbd>E</kbd> or <kbd>&larr;</kbd><kbd>&rarr;</kbd> turn; <kbd>&uarr;</kbd><kbd>&darr;</kbd> look up and down.</li>
          <li><b>Speed:</b> scroll the mouse wheel to set cruise speed.</li>
          <li><b>Exit:</b> press <kbd>Esc</kbd> or use <b>Exit</b> to leave drone mode.</li>
        </ul>
        <p class="flightinfo__note">For visual exploration only. Not for navigation.</p>
      </div>
      <div class="flightinfo__foot">
        <button class="flightinfo__start" type="button">Start drone mode</button>
      </div>
    </div>`;
  document.body.appendChild(info);
  info.querySelector(".flightinfo__close").addEventListener("click", closeInfo);
  info.querySelector(".flightinfo__backdrop").addEventListener("click", closeInfo);
  info.querySelector(".flightinfo__start").addEventListener("click", onStartBtn);
}

function openInfo(preflight = false) {
  if (!info) return;
  if (preflight && !isDesktop()) return; // drone mode is desktop-only
  pendingStart = preflight;
  infoOpen = true;
  keys.clear();
  if (document.pointerLockElement) document.exitPointerLock();
  info.querySelector(".flightinfo__title").textContent = preflight ? "Drone mode (Experimental)" : "Drone controls";
  info.querySelector(".flightinfo__start").textContent = preflight ? "Start drone mode" : "Resume";
  info.classList.add("is-open");
}

function closeInfo() {
  infoOpen = false;
  pendingStart = false;
  info?.classList.remove("is-open");
}

// Primary panel button: begin flying (pre-flight) or just resume (mid-flight info).
function onStartBtn() {
  const start = pendingStart;
  closeInfo();
  if (start) enter();
}
