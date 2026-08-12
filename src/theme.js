// Dynamic accent: retint the UI to each capture's dominant colour (CORS-guarded),
// falling back to a per-category hue when the thumbnail can't be sampled.
import { clamp } from "./util.js";

const FALLBACK = {
  City: "#4fd6e6",
  Landmark: "#9a8bff",
  Industry: "#ff9f5c",
  Construction: "#67e39a"
};

const cache = new Map();

export function applyAccent(capture) {
  if (cache.has(capture.id)) {
    setAccent(cache.get(capture.id));
    return;
  }
  setAccent(FALLBACK[capture.category] || "#3fe0d0");
  extract(capture.thumb)
    .then((hex) => {
      if (!hex) return;
      cache.set(capture.id, hex);
      setAccent(hex);
    })
    .catch(() => {}); // tainted / blocked thumbnail → keep the fallback
}

function setAccent(hex) {
  const { r, g, b } = hexToRgb(hex);
  const root = document.documentElement.style;
  root.setProperty("--accent", hex);
  root.setProperty("--accent-rgb", `${r}, ${g}, ${b}`);
  const [h, s, l] = rgbToHsl(r, g, b);
  root.setProperty("--accent-2", hslToHex((h + 42) % 360, clamp(s, 0.4, 0.8), clamp(l + 0.05, 0.5, 0.72)));
}

function extract(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const n = 28;
        const c = document.createElement("canvas");
        c.width = n;
        c.height = n;
        const ctx = c.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, n, n);
        resolve(vivid(ctx.getImageData(0, 0, n, n).data));
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Dominant vivid hue → a clean, punchy accent (avoids muddy browns / olives).
function vivid(data) {
  const buckets = Array.from({ length: 12 }, () => ({ w: 0, r: 0, g: 0, b: 0 }));
  let saturated = 0, total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 200) continue;
    total++;
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.28 || l < 0.18 || l > 0.9) continue; // skip greys, near-black, near-white
    saturated++;
    const weight = s * (1 - Math.abs(l - 0.55));
    const bk = buckets[Math.floor(h / 30) % 12];
    bk.w += weight; bk.r += data[i] * weight; bk.g += data[i + 1] * weight; bk.b += data[i + 2] * weight;
  }
  if (!total || saturated < total * 0.06) return null; // mostly grey/muddy → keep category colour
  const best = buckets.reduce((a, b) => (b.w > a.w ? b : a));
  if (best.w <= 0) return null;
  const [h] = rgbToHsl(best.r / best.w, best.g / best.w, best.b / best.w);
  return hslToHex(h, 0.72, 0.58);
}

/* ---- colour helpers ---- */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

function hslToHex(h, s, l) {
  h /= 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => {
    const k = (n + h * 12) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
