// Scan FX: the cinematic intro reveal and the between-capture transition wipe.
// Restrained motion — one veil, one light sweep, decode-in title.
import { gsap } from "gsap";
import { el } from "./util.js";

let veil, sweep, titleWrap, nameEl, locEl;

export function initFx() {
  const root = el("div", "fx");
  veil = el("div", "fx__veil");
  sweep = el("div", "fx__sweep");
  titleWrap = el("div", "fx__title");
  nameEl = el("div", "fx__name");
  locEl = el("div", "fx__loc");
  titleWrap.append(nameEl, locEl);
  root.append(veil, sweep, titleWrap);
  document.body.appendChild(root);

  gsap.set(veil, { opacity: 1 }); // opaque until the intro dissolves it
  gsap.set(sweep, { opacity: 0, yPercent: -120 });
  gsap.set(titleWrap, { opacity: 0 });

  return { reveal };
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>#*·";

// Character-by-character decode/scramble converging on `text`.
function decode(node, text, duration = 0.8) {
  const chars = [...text];
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1,
    duration,
    ease: "power2.out",
    onUpdate: () => {
      const shown = Math.floor(state.p * chars.length);
      node.textContent = chars
        .map((ch, i) => (i < shown || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join("");
    },
    onComplete: () => { node.textContent = text; }
  });
}

// Cinematic title reveal on every capture; the first load also dissolves the veil.
function reveal(capture, { intro = false } = {}) {
  const tl = gsap.timeline();
  gsap.set(titleWrap, { opacity: 1, y: 0 });
  if (intro) tl.to(veil, { opacity: 0, duration: 0.9, ease: "power2.inOut" }, 0.9);
  const t0 = intro ? 0.45 : 0;
  tl.add(decode(nameEl, capture.title, intro ? 0.85 : 0.62), t0)
    .add(decode(locEl, `${capture.location}, ${capture.country}`, intro ? 0.7 : 0.5), t0 + 0.27)
    .fromTo(sweep, { opacity: 0.85, yPercent: -120 }, { yPercent: 260, duration: intro ? 1.0 : 0.75, ease: "power1.inOut" }, intro ? 1.5 : 0.05)
    .set(sweep, { opacity: 0, yPercent: -120 })
      .to(titleWrap, { opacity: 0, y: -14, duration: 0.55, ease: "power2.in" }, intro ? 3.5 : 2.3);
  return tl;
}
