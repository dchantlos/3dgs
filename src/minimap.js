// Orthographic world globe (d3-geo). Renders real continents + country borders,
// rotates to each capture's location and draws a great-circle arc between sites.
import { gsap } from "gsap";
import { geoOrthographic, geoPath, geoGraticule10, geoInterpolate } from "d3-geo";
import { feature, mesh } from "topojson-client";
import topo from "world-atlas/countries-110m.json";
import { el, mercToLonLat } from "./util.js";

const SIZE = 132, R = 60, C = SIZE / 2;

const land = feature(topo, topo.objects.land);
const borders = mesh(topo, topo.objects.countries, (a, b) => a !== b);
const graticule = geoGraticule10();

let projection, path, dom = {};
let center = { lon: 0, lat: 18 };
let prev = null;
let arcFeature = null;

export function initMinimap() {
  const root = el("div", "globe");
  root.innerHTML = `
    <svg viewBox="0 0 ${SIZE} ${SIZE}" width="${SIZE}" height="${SIZE}" aria-hidden="true">
      <defs>
        <radialGradient id="globeFill" cx="38%" cy="32%" r="74%">
          <stop offset="0" stop-color="#123049"/>
          <stop offset="0.6" stop-color="#0a1119"/>
          <stop offset="1" stop-color="#05080e"/>
        </radialGradient>
      </defs>
      <circle class="globe__sphere" cx="${C}" cy="${C}" r="${R}"/>
      <path class="globe__grat"/>
      <path class="globe__land"/>
      <path class="globe__borders"/>
      <path class="globe__arc"/>
      <g class="globe__marker">
        <circle class="globe__mring" r="3.6"/>
        <circle class="globe__mdot" r="1.3"/>
      </g>
    </svg>
    <div class="globe__label" id="globeLabel">—</div>`;
  (document.getElementById("globeCorner") || document.body).appendChild(root);

  projection = geoOrthographic().scale(R).translate([C, C]).clipAngle(90);
  path = geoPath(projection);
  dom = {
    grat: root.querySelector(".globe__grat"),
    land: root.querySelector(".globe__land"),
    borders: root.querySelector(".globe__borders"),
    arc: root.querySelector(".globe__arc"),
    marker: root.querySelector(".globe__marker"),
    label: root.querySelector("#globeLabel")
  };
  render();
  return { goTo };
}

function render() {
  projection.rotate([-center.lon, -center.lat]);
  dom.grat.setAttribute("d", path(graticule) || "");
  dom.land.setAttribute("d", path(land) || "");
  dom.borders.setAttribute("d", path(borders) || "");
  dom.arc.setAttribute("d", arcFeature ? path(arcFeature) || "" : "");
  const m = projection([center.lon, center.lat]); // rotation centre → globe centre
  if (m) dom.marker.setAttribute("transform", `translate(${m[0].toFixed(1)} ${m[1].toFixed(1)})`);
}

function goTo(capture, { animate = true } = {}) {
  const target = mercToLonLat(capture.camera.x, capture.camera.y);
  dom.label.textContent = `${capture.location}, ${capture.country}`;
  const from = prev || target;

  if (!animate || !prev) {
    center = target;
    prev = target;
    arcFeature = null;
    render();
    return;
  }

  arcFeature = { type: "LineString", coordinates: [[from.lon, from.lat], [target.lon, target.lat]] };
  const interp = geoInterpolate([from.lon, from.lat], [target.lon, target.lat]);
  const state = { t: 0 };
  gsap.to(state, {
    t: 1,
    duration: 1.2,
    ease: "power2.inOut",
    onUpdate: () => {
      const p = interp(state.t);
      center = { lon: p[0], lat: p[1] };
      render();
    },
    onComplete: () => {
      center = target;
      prev = target;
      arcFeature = null;
      render();
    }
  });
}
