// Cinematic guided tour: auto-flies through every capture with captions.
import { CAPTURES, FLY_MS, TOUR_DWELL_MS } from "./config.js";

let selectCapture = () => {};
let playing = false;
let idx = 0;
let timer = null;

export function initTour(handler) {
  selectCapture = handler;
  document.getElementById("tourPlay").addEventListener("click", toggle);
  document.getElementById("tourPrev").addEventListener("click", () => step(-1));
  document.getElementById("tourNext").addEventListener("click", () => step(1));
}

export function setCurrent(captureId) {
  const i = CAPTURES.findIndex((c) => c.id === captureId);
  if (i >= 0) idx = i;
  const c = CAPTURES[idx];
  document.getElementById("tourTitle").textContent = c.title;
  document.getElementById("tourSub").textContent = `${c.location} · © ${c.provider}`;
}

function step(dir) {
  idx = (idx + dir + CAPTURES.length) % CAPTURES.length;
  selectCapture(CAPTURES[idx], { fromTour: true });
}

function toggle() {
  playing ? stop() : start();
}

export function start() {
  playing = true;
  document.getElementById("tourPlay").classList.add("is-playing");
  document.body.classList.add("touring");
  advance();
}

export function stop() {
  playing = false;
  document.getElementById("tourPlay").classList.remove("is-playing");
  document.body.classList.remove("touring");
  clearTimeout(timer);
  setProgress(0);
}

// Called by main after a tour-driven capture finishes loading.
export function scheduleNext() {
  if (!playing) return;
  runProgress(TOUR_DWELL_MS);
  timer = setTimeout(() => {
    idx = (idx + 1) % CAPTURES.length;
    advance();
  }, TOUR_DWELL_MS);
}

function advance() {
  selectCapture(CAPTURES[idx], { fromTour: true });
}

let rafId = null;
function runProgress(ms) {
  setProgress(0);
  const start = performance.now();
  const tick = (t) => {
    const p = Math.min((t - start) / ms, 1);
    setProgress(p);
    if (p < 1 && playing) rafId = requestAnimationFrame(tick);
  };
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(tick);
}

function setProgress(p) {
  document.getElementById("tourProgress").style.transform = `scaleX(${p})`;
}

export function isPlaying() {
  return playing;
}
