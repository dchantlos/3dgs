// About panel: app summary + data & service credits. Reuses the info-modal shell.
import { el } from "./util.js";

export function initAbout() {
  const trigger = document.getElementById("aboutBtn");
  if (!trigger) return;

  const modal = el("div", "flightinfo aboutinfo");
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-label", "About this app");
  modal.innerHTML = `
    <div class="flightinfo__backdrop"></div>
    <div class="flightinfo__panel">
      <div class="flightinfo__head">
        <strong class="flightinfo__title">About</strong>
        <button class="flightinfo__close" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="flightinfo__body">
        <p class="aboutinfo__lead">A cinematic explorer for ArcGIS Gaussian splat reality captures, built on the ArcGIS Maps SDK for JavaScript.</p>
        <h4>Data &amp; services</h4>
        <ul class="flightinfo__list">
          <li><b>Software:</b> <a href="https://developers.arcgis.com/javascript/latest/" target="_blank" rel="noopener noreferrer">ArcGIS Maps SDK for JavaScript</a>, under the <a href="https://developers.arcgis.com/javascript/latest/licensing/" target="_blank" rel="noopener noreferrer">Esri licensing and attribution terms</a>.</li>
          <li><b>Reality captures:</b> Gaussian splat scenes from the public <a href="https://www.arcgis.com/home/item.html?id=646ad56647544762b1919508158ba619" target="_blank" rel="noopener noreferrer">Gaussian Splat Examples</a> web scene, processed with <a href="https://www.esri.com/en-us/arcgis/products/arcgis-reality/overview" target="_blank" rel="noopener noreferrer">ArcGIS Reality</a>. Each capture&rsquo;s provider is credited on its gallery card and in the scene attribution.</li>
          <li><b><a href="https://livingatlas.arcgis.com/en/browse/" target="_blank" rel="noopener noreferrer">Esri Living Atlas</a>:</b> basemap <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9" target="_blank" rel="noopener noreferrer">World Imagery</a> and <a href="https://www.arcgis.com/home/item.html?id=7029fb60158543ad845c7e1527af11e4" target="_blank" rel="noopener noreferrer">Terrain 3D</a> elevation. Live provider credits are shown by ArcGIS in the scene attribution.</li>
          <li><b>Weather:</b> real-time conditions from <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>.</li>
        </ul>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const open = () => modal.classList.add("is-open");
  const close = () => modal.classList.remove("is-open");
  trigger.addEventListener("click", open);
  modal.querySelector(".flightinfo__close").addEventListener("click", close);
  modal.querySelector(".flightinfo__backdrop").addEventListener("click", close);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("is-open")) close();
  });
}
