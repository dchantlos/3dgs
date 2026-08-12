// Custom reticle cursor + magnetic pull on interactive controls.
// Skipped on touch devices. The centre dot tracks the pointer exactly so
// clicking stays precise while the outer ring trails with easing.
import { gsap } from "gsap";
import { el, clamp } from "./util.js";

const MAGNET = ".dock__btn, .tourbar__nav, .tourbar__play, #galleryCollapse, .chip, .card";

export function initCursor() {
  if (window.matchMedia("(pointer: coarse)").matches) return;

  const ring = el("div", "cursor__ring");
  const dot = el("div", "cursor__dot");
  document.body.append(ring, dot);
  document.body.classList.add("has-cursor");

  const ringX = gsap.quickTo(ring, "x", { duration: 0.18, ease: "power3" });
  const ringY = gsap.quickTo(ring, "y", { duration: 0.18, ease: "power3" });

  let magnet = null;

  window.addEventListener("pointermove", (e) => {
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    ringX(e.clientX);
    ringY(e.clientY);

    const target = e.target.closest?.(MAGNET) || null;
    if (target !== magnet && magnet) {
      gsap.to(magnet, { x: 0, y: 0, duration: 0.45, ease: "elastic.out(1, 0.4)" });
    }
    magnet = target;
    if (target) {
      const r = target.getBoundingClientRect();
      gsap.to(target, {
        x: clamp((e.clientX - (r.left + r.width / 2)) * 0.24, -6, 6),
        y: clamp((e.clientY - (r.top + r.height / 2)) * 0.24, -6, 6),
        duration: 0.3,
        ease: "power3.out"
      });
    }
  });

  document.addEventListener("pointerover", (e) => {
    if (e.target.closest?.(MAGNET)) document.body.classList.add("cursor-lock");
  });
  document.addEventListener("pointerout", (e) => {
    if (e.target.closest?.(MAGNET) && !e.relatedTarget?.closest?.(MAGNET)) {
      document.body.classList.remove("cursor-lock");
    }
  });
  window.addEventListener("blur", () => document.body.classList.remove("cursor-lock"));
}
