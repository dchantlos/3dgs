# Gaussian Splat Explorer

A cinematic, standalone re-imagining of Esri's *Gaussian Splat Explorer* Experience
Builder app, rebuilt on the **ArcGIS Maps SDK for JavaScript 5.1** with a modern,
glassmorphism UI.

It explores 11 public Gaussian Splat reality captures from the "Gaussian Splat
Examples" web scene and layers on interaction the original app didn't have.

## Features

- **Capture gallery** — browse 11 reality captures with real thumbnails and category
  filters; click to fly there.
- **Cinematic tour** — auto-fly through every capture with captions and progress.
- **Reality-inspection toolkit** — Slice, Line of sight, Elevation profile and 3D
  Measure, all of which work directly on Gaussian Splat layers (new in SDK 5.1).
- **Isolate** — clip the globe to a single capture's footprint for focus.
- **Glowing POI hotspots** — emissive orbs that bloom via the `webscene/Glow` effect.
- **Time compare** — before/after of Esri Building E (2019 under construction → 2025
  completed), the same site captured twice.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build to dist/
npm run preview
```

## Data

All splats are public 3D Tiles / Gaussian Splat services sourced from the web scene
`646ad56647544762b1919508158ba619` (IVT.maps.arcgis.com). No token required. Item IDs
and cameras live in [`src/config.js`](src/config.js).

## Notes

- Requires a WebGL2-capable browser (same as the original app).
- The Slice / Line of sight / Elevation profile / Measurement widgets are used from
  `@arcgis/core/widgets`. These are deprecated in favor of map components at 6.0; the
  equivalent `arcgis-slice`, `arcgis-line-of-sight`, etc. components are drop-in when
  migrating.
