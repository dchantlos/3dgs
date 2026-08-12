// Tiny DOM + math helpers shared by the cinematic UI modules.
export function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

export const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
export const lerp = (a, b, t) => a + (b - a) * t;

// Web Mercator (wkid 102100) metres -> WGS84 degrees.
const R = 6378137;
export function mercToLonLat(x, y) {
  return {
    lon: (x / R) * (180 / Math.PI),
    lat: (2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * (180 / Math.PI)
  };
}
