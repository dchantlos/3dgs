# Gaussian Splat Explorer — session handoff

A resume guide for picking this project up on another machine.

## Where things live
- **Repo:** https://github.com/dchantlos/3dgs (branch `main`). Clone folder: `gaussian-splat-explorer`.
- **Live app:** https://dchantlos.github.io/3dgs/ (GitHub Pages, auto-deploys from `main` via the Actions workflow).
- **Latest deployed commit:** `dd5b4e0`.

## Run it
```bash
git clone https://github.com/dchantlos/3dgs gaussian-splat-explorer
cd gaussian-splat-explorer
npm install
npm run dev        # http://localhost:5173 (or next free port)
npm run build      # production build
```
Deploy = commit + `git push origin main`; the Pages Action rebuilds in ~1–2 min.

## Stack
Vite 5 + ArcGIS Maps SDK for JavaScript (`@arcgis/core` ^5.1), vanilla ES modules (no framework).
Key `src/` files: `scene.js` (SceneView), `config.js` (`CAPTURES` + tunables), `gallery.js`, `flight.js`
(drone mode), `drone.js` (drone model), `about.js`, `weather.js`, `hud.js`, `minimap.js`, `tools.js`, `style.css`.

## Done in the latest session
- **New capture:** Minato Mirai, Yokohama (Kokusai Kogyo, Leica CityMapper2). Added to `config.js` `CAPTURES`
  with a 38 m entry in `ELEVATION_OFFSETS`; credit shows on its gallery card.
- **About panel:** brand-bar "About" button opens the Data & services credits (moved out of the drone panel).
- **Drone panel** renamed "Drone mode (Experimental)".
- **Darker panels:** `--panel` / `--panel-2` tokens in `style.css`.
- **Drone third-person mode fixed:**
  - Heading now repaints reliably (see `drone.js` `setPose`): re-orient by assigning a **clone of a pristine
    pre-built symbol**, not by mutating `layer.heading` in place (in-place changes never repaint — that caused
    the "frozen / different per capture" bug).
  - `HEADING_OFFSET = 180` so the sensor leads travel.
  - Tilt directions: `flight.js` `LEAN_PITCH_SIGN = 1`, `LEAN_ROLL_SIGN = -1`.
  - Controls: `W A S D` move · `↑ / ↓` altitude · `I / K` pitch · `Q E` or `← / →` turn · `V` 1st/3rd · wheel = speed.

## Gotchas worth knowing
- The **integrated/headless browser uses SwiftShader and cannot render the splats or the drone glTF** — only the
  sky. Verify any drone/splat visuals in a real-GPU browser; local screenshots of the drone won't work.
- **Add a capture** = one object in `config.js` `CAPTURES` (+ optional `ELEVATION_OFFSETS[id]`). The loader uses
  `capture.url` (the `3DTilesServer/tileset.json`); `itemId` is only for the gallery thumbnail via `THUMB()`.
- **Drone model updates:** always clone the *original* pre-built symbol per orientation change (reuses the cached
  glTF, no reload). Reassigning the graphic's own repeatedly-cloned symbol leaks GPU memory.

## To continue (next session)
- _Add your next tasks here._
