// Capture gallery: filter chips + capture cards.
import { CAPTURES, CATEGORIES } from "./config.js";

let onSelect = () => {};
let activeId = null;
let activeFilter = "All";

export function initGallery(handler) {
  onSelect = handler;
  buildChips();
  buildCards();
  wireCollapse();
}

function buildChips() {
  const host = document.getElementById("filterChips");
  host.innerHTML = "";
  CATEGORIES.forEach((cat) => {
    const b = document.createElement("button");
    b.className = "chip" + (cat === activeFilter ? " is-on" : "");
    b.textContent = cat;
    b.setAttribute("role", "tab");
    b.addEventListener("click", () => {
      activeFilter = cat;
      buildChips();
      buildCards();
    });
    host.appendChild(b);
  });
}

function buildCards() {
  const host = document.getElementById("captureList");
  host.innerHTML = "";
  const list = CAPTURES.filter((c) => activeFilter === "All" || c.category === activeFilter);

  list.forEach((c) => {
    const card = document.createElement("button");
    card.className = "card" + (c.id === activeId ? " is-active" : "");
    card.setAttribute("role", "listitem");
    card.dataset.id = c.id;
    card.innerHTML = `
      <span class="card__thumb" style="background-image:url('${c.thumb}')">
        <span class="card__cat card__cat--${c.category.toLowerCase()}">${c.category}</span>
        ${c.epoch ? `<span class="card__epoch">${c.epoch}</span>` : ""}
      </span>
      <span class="card__body">
        <strong class="card__title">${c.title}</strong>
        <span class="card__loc">${c.location}, ${c.country}</span>
        <span class="card__credit">© ${c.provider}</span>
      </span>`;
    card.addEventListener("click", () => onSelect(c));
    host.appendChild(card);
  });
}

export function setActiveCard(id) {
  activeId = id;
  document.querySelectorAll(".card").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.id === id);
    if (el.dataset.id === id) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

function wireCollapse() {
  const panel = document.getElementById("galleryPanel");
  const btn = document.getElementById("galleryCollapse");
  const setCollapsed = (collapsed) => {
    panel.classList.toggle("is-collapsed", collapsed);
    document.body.classList.toggle("gallery-collapsed", collapsed);
    btn.textContent = collapsed ? "›" : "‹";
    btn.title = collapsed ? "Show panel" : "Hide panel";
  };
  btn.addEventListener("click", () => setCollapsed(!panel.classList.contains("is-collapsed")));
  // Collapse by default on small/mobile screens; desktop stays open.
  if (window.matchMedia("(max-width: 860px)").matches) setCollapsed(true);
}
