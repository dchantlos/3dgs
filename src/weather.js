// Live weather panel (Open-Meteo, no key) + optional real ArcGIS SceneView weather
// effects, driven per capture. Toggling the button applies rain/clouds/etc. from the
// current conditions at the active splat's location using the ArcGIS Maps SDK.
import SunnyWeather from "@arcgis/core/views/3d/environment/SunnyWeather.js";
import CloudyWeather from "@arcgis/core/views/3d/environment/CloudyWeather.js";
import RainyWeather from "@arcgis/core/views/3d/environment/RainyWeather.js";
import SnowyWeather from "@arcgis/core/views/3d/environment/SnowyWeather.js";
import FoggyWeather from "@arcgis/core/views/3d/environment/FoggyWeather.js";
import { el, clamp, mercToLonLat } from "./util.js";

const REFRESH_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 8000;
const COMPASS = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];

const svg = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
const ICONS = {
  sun: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/>'),
  moon: svg('<path d="M20 14.5A8 8 0 1 1 9.5 4a6.3 6.3 0 0 0 10.5 10.5z"/>'),
  partly: svg('<circle cx="8" cy="7.5" r="3"/><path d="M8 1.6v1.5M1.6 7.5h1.5M3.7 3.2l1 1"/><path d="M17 20H8a4 4 0 0 1-.3-8 5 5 0 0 1 9.6 1.2A3.4 3.4 0 0 1 17 20z"/>'),
  cloud: svg('<path d="M17.5 19H7a4.2 4.2 0 0 1-.4-8.4 5.5 5.5 0 0 1 10.6 1.3A3.6 3.6 0 0 1 17.5 19z"/>'),
  fog: svg('<path d="M4 10h13M6 14h13M4 18h11"/><path d="M6.5 6.5a5 5 0 0 1 9.6 1"/>'),
  rain: svg('<path d="M17.5 15H7a4.2 4.2 0 0 1-.4-8.4A5.5 5.5 0 0 1 17.2 8 3.6 3.6 0 0 1 17.5 15z"/><path d="M8 18l-1 2M12 18l-1 2M16 18l-1 2"/>'),
  snow: svg('<path d="M17.5 14H7a4.2 4.2 0 0 1-.4-8.4A5.5 5.5 0 0 1 17.2 7 3.6 3.6 0 0 1 17.5 14z"/><path d="M9 18h.01M12 20h.01M15 18h.01"/>'),
  storm: svg('<path d="M17.5 13H7a4.2 4.2 0 0 1-.4-8.4A5.5 5.5 0 0 1 17.2 6 3.6 3.6 0 0 1 17.5 13z"/><path d="M12 12l-2 4h3l-2 4"/>')
};

export function initWeather(view) {
  const panel = el("section", "wx");
  panel.id = "wxPanel";
  panel.innerHTML = `
    <div class="wx__head">
      <span class="wx__icon" id="wxIcon">${ICONS.cloud}</span>
      <div class="wx__now">
        <strong class="wx__temp" id="wxTemp">—</strong>
        <span class="wx__cond" id="wxCond">Weather</span>
      </div>
      <span class="wx__dot" id="wxDot" data-state="loading" title="Loading"></span>
    </div>
    <div class="wx__grid">
      <div class="wx__cell"><span class="wx__k">Wind</span><b id="wxWind">—</b></div>
      <div class="wx__cell"><span class="wx__k">Rain</span><b id="wxRain">—</b></div>
      <div class="wx__cell"><span class="wx__k">Humidity</span><b id="wxHum">—</b></div>
    </div>
    <button class="wx__toggle" id="wxToggle" type="button" aria-pressed="false">
      <span class="wx__toggle-dot"></span>
      <span id="wxToggleLabel">Show real-time weather effects</span>
    </button>`;
  (document.getElementById("cornerStack") || document.body).appendChild(panel);

  const q = (s) => panel.querySelector(s);
  const ui = {
    icon: q("#wxIcon"), temp: q("#wxTemp"), cond: q("#wxCond"), dot: q("#wxDot"),
    wind: q("#wxWind"), rain: q("#wxRain"), hum: q("#wxHum"),
    toggle: q("#wxToggle"), toggleLabel: q("#wxToggleLabel")
  };

  let effectsOn = false;
  let current = null;
  let activeCapture = null;
  let timer = 0;

  ui.toggle.addEventListener("click", () => {
    effectsOn = !effectsOn;
    ui.toggle.setAttribute("aria-pressed", String(effectsOn));
    ui.toggleLabel.textContent = effectsOn ? "Hide weather effects" : "Show real-time weather effects";
    panel.classList.toggle("is-on", effectsOn);
    if (effectsOn) applyEffects();
    else view.environment.weather = new SunnyWeather({ cloudCover: 0 });
  });

  function applyEffects() {
    if (current) view.environment.weather = toWeather(current);
  }

  function setDot(state, title) {
    ui.dot.dataset.state = state;
    ui.dot.title = title;
  }

  function paint(c) {
    const d = describe(c.weather_code ?? 3, c.is_day ?? 1);
    ui.icon.innerHTML = ICONS[d.icon] || ICONS.cloud;
    ui.temp.textContent = `${Math.round(c.temperature_2m)}°`;
    ui.cond.textContent = d.label;
    const dir = COMPASS[Math.round(((c.wind_direction_10m ?? 0) % 360) / 22.5) % 16];
    ui.wind.textContent = `${Math.round(c.wind_speed_10m ?? 0)} m/s ${dir}`;
    const precip = c.precipitation ?? c.rain ?? 0;
    ui.rain.textContent = `${precip.toFixed(1)} mm`;
    ui.hum.textContent = `${Math.round(c.relative_humidity_2m ?? 0)}%`;
  }

  async function load(capture) {
    activeCapture = capture;
    setDot("loading", "Updating…");
    const { lat, lon } = mercToLonLat(capture.camera.x, capture.camera.y);
    try {
      const c = await fetchCurrent(lat, lon);
      if (activeCapture !== capture) return; // a newer capture was selected
      current = c;
      paint(c);
      setDot("live", "Live");
      if (effectsOn) applyEffects();
    } catch {
      if (activeCapture === capture) setDot("offline", "Weather unavailable");
    }
  }

  function update(capture) {
    load(capture);
    clearInterval(timer);
    timer = setInterval(() => activeCapture && load(activeCapture), REFRESH_MS);
  }

  return { update };
}

async function fetchCurrent(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
    "&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m" +
    "&wind_speed_unit=ms&timezone=auto";
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.current) throw new Error("no current data");
    return data.current;
  } finally {
    clearTimeout(t);
  }
}

// Map an Open-Meteo current reading to an ArcGIS SceneView weather instance.
function toWeather(c) {
  const cloud = clamp((c.cloud_cover ?? 0) / 100, 0, 1);
  const code = c.weather_code ?? 0;
  const precip = c.precipitation ?? c.rain ?? 0;
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return new SnowyWeather({ cloudCover: Math.max(cloud, 0.7), precipitation: clamp(Math.max(precip, 0.6) / 3, 0.3, 1), snowCover: "enabled" });
  }
  if (code === 45 || code === 48) {
    return new FoggyWeather({ fogStrength: 0.7 });
  }
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95 || precip > 0) {
    return new RainyWeather({ cloudCover: Math.max(cloud, 0.6), precipitation: clamp(Math.max(precip, 0.6) / 4, 0.25, 1) });
  }
  if (cloud > 0.25) return new CloudyWeather({ cloudCover: cloud });
  return new SunnyWeather({ cloudCover: cloud });
}

// WMO weather code -> label + icon key.
function describe(code, isDay) {
  if (code === 0) return { label: "Clear", icon: isDay ? "sun" : "moon" };
  if (code <= 2) return { label: "Partly cloudy", icon: "partly" };
  if (code === 3) return { label: "Overcast", icon: "cloud" };
  if (code === 45 || code === 48) return { label: "Fog", icon: "fog" };
  if (code >= 51 && code <= 57) return { label: "Drizzle", icon: "rain" };
  if (code >= 61 && code <= 67) return { label: "Rain", icon: "rain" };
  if (code >= 71 && code <= 77) return { label: "Snow", icon: "snow" };
  if (code >= 80 && code <= 82) return { label: "Rain showers", icon: "rain" };
  if (code >= 85 && code <= 86) return { label: "Snow showers", icon: "snow" };
  if (code >= 95) return { label: "Thunderstorm", icon: "storm" };
  return { label: "Cloudy", icon: "cloud" };
}
