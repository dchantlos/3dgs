// Scanner HUD overlay: corner brackets, scanlines, grain, vignette, and a live
// coordinate readout of the map point under the cursor.
import { el, mercToLonLat } from "./util.js";

const GRAIN =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'>" +
  "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter>" +
  "<rect width='140' height='140' filter='url(%23n)'/></svg>";

export function initHud(view) {
  const root = el("div", "hud");
  root.innerHTML = `
    <div class="hud__corner hud__corner--tl"></div>
    <div class="hud__corner hud__corner--tr"></div>
    <div class="hud__corner hud__corner--bl"></div>
    <div class="hud__corner hud__corner--br"></div>
    <div class="hud__scan"></div>
    <div class="hud__grain"></div>
    <div class="hud__vignette"></div>
    <div class="hud__reticle"><span></span><span></span></div>
    <div class="hud__readout">
      <div class="hud__coord"><span class="hud__k">LAT</span><b id="hudLat">—</b></div>
      <div class="hud__coord"><span class="hud__k">LON</span><b id="hudLon">—</b></div>
      <div class="hud__coord"><span class="hud__k">ELEV</span><b id="hudElev">—</b></div>
    </div>`;
  document.body.appendChild(root);
  root.querySelector(".hud__grain").style.backgroundImage = `url("${GRAIN}")`;

  const q = (sel) => root.querySelector(sel);
  const lat = q("#hudLat"), lon = q("#hudLon"), elev = q("#hudElev");

  // Read the map point under the cursor; throttle to one paint per frame.
  let pending = null, raf = 0;
  const paint = () => {
    raf = 0;
    if (!pending) return;
    const mp = view.toMap(pending);
    if (!mp) return; // cursor is over empty space / off the globe
    let lonV = mp.longitude, latV = mp.latitude;
    if (lonV == null || latV == null) {
      const ll = mercToLonLat(mp.x, mp.y);
      lonV = ll.lon; latV = ll.lat;
    }
    lat.textContent = fmtDeg(latV, "N", "S");
    lon.textContent = fmtDeg(lonV, "E", "W");
    elev.textContent = fmtElev(mp.z);
  };
  view.on("pointer-move", (event) => {
    pending = { x: event.x, y: event.y };
    if (!raf) raf = requestAnimationFrame(paint);
  });
}

function fmtDeg(v, pos, neg) {
  if (v == null || Number.isNaN(v)) return "—";
  return `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;
}

function fmtElev(z) {
  if (z == null || Number.isNaN(z)) return "—";
  return `${Math.round(z).toLocaleString()} m`;
}
