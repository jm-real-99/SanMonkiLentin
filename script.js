const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOutQuad = (t) => (t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2);

const scene = document.getElementById("scene");
const hint = document.getElementById("hint");
const toName = document.getElementById("toName");
const letterSection = document.getElementById("letterSection");

// Collage
const collage = document.getElementById("collage");

/**
 * IMPORTANTE:
 * - Crea una carpeta "stickers/" al lado de index.html
 * - Mete ahí tus PNGs
 * - Y lista aquí los nombres (rutas relativas)
 */
const STICKERS = [
  "stickers/sticker1.png",
  "stickers/sticker2.png",
  "stickers/sticker3.png",
  "stickers/sticker4.png",
  "stickers/sticker5.png",
  "stickers/sticker6.png",
  "stickers/sticker7.png",
  "stickers/sticker8.png",
  "stickers/sticker9.png",
  "stickers/sticker10.png",
  "stickers/meme.png",
];

let collageShown = false;

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
/*
function buildCollage() {
  if (!collage || STICKERS.length === 0) return;

  collage.innerHTML = "";

  // Duplicamos 2 veces cada imagen
  const items = [];
  for (const src of STICKERS) items.push(src, src);
  shuffle(items);

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Evitar la zona central donde está la carta (aprox)
  const forbidden = {
    x1: w * 0.18,
    x2: w * 0.82,
    y1: h * 0.06,
    y2: h * 0.92
  };

  const frag = document.createDocumentFragment();

  for (const src of items) {
    const img = new Image();
    img.src = src;
    img.className = "sticker";

    // Tamaños variados (stickers/fotos)
    const size = Math.round(90 + Math.random() * 160); // 90..250
    img.style.width = `${size}px`;

    // Posición random (intentando fuera del centro)
    let x = 0, y = 0;
    for (let tries = 0; tries < 30; tries++) {
      x = Math.random() * Math.max(1, (w - size));
      y = Math.random() * Math.max(1, (h - size));
      const inside =
        x > forbidden.x1 && x < forbidden.x2 &&
        y > forbidden.y1 && y < forbidden.y2;
      if (!inside) break;
    }

    const rot = (Math.random() * 34 - 17).toFixed(1);          // -17..17
    const scale = (0.90 + Math.random() * 0.35).toFixed(2);    // 0.90..1.25
    const opacity = (0.55 + Math.random() * 0.35).toFixed(2);  // 0.55..0.90

    img.style.left = `${x}px`;
    img.style.top = `${y}px`;
    img.style.transform = `rotate(${rot}deg) scale(${scale})`;
    img.style.opacity = opacity;

    frag.appendChild(img);
  }

  collage.appendChild(frag);
}
*/
function buildCollage() {
  if (!collage || STICKERS.length === 0) return;

  collage.innerHTML = "";

  // Duplicamos 2 veces cada imagen
  const items = [];
  for (const src of STICKERS) items.push(src, src);
  shuffle(items);

  const w = window.innerWidth;
  const h = window.innerHeight;

  // Rectángulo real de la carta (para colocar alrededor)
  const paper = document.querySelector(".letterPaper");
  const r = paper ? paper.getBoundingClientRect() : null;

  // Si por lo que sea no existe, colocamos random simple
  if (!r) {
    const max = Math.min(items.length, 14);
    for (let i = 0; i < max; i++) {
      const img = new Image();
      img.src = items[i];
      img.className = "sticker";
      const size = 90 + Math.random() * 140;
      img.style.width = `${size}px`;
      img.style.left = `${Math.random() * (w - size)}px`;
      img.style.top = `${Math.random() * (h - size)}px`;
      img.style.transform = `rotate(${(Math.random()*34-17).toFixed(1)}deg)`;
      img.style.opacity = (0.6 + Math.random() * 0.3).toFixed(2);
      collage.appendChild(img);
    }
    return;
  }

  // Márgenes para que no toquen la carta
  const m = 16;
  const fx1 = Math.max(0, r.left - m);
  const fy1 = Math.max(0, r.top - m);
  const fx2 = Math.min(w, r.right + m);
  const fy2 = Math.min(h, r.bottom + m);

  // Bandas alrededor de la carta
  const regions = [
    { name: "top",    x1: 0,  y1: 0,   x2: w,  y2: fy1 },
    { name: "bottom", x1: 0,  y1: fy2, x2: w,  y2: h  },
    { name: "left",   x1: 0,  y1: 0,   x2: fx1, y2: h  },
    { name: "right",  x1: fx2,y1: 0,   x2: w,  y2: h  },
  ].filter(reg => (reg.x2 - reg.x1) > 40 && (reg.y2 - reg.y1) > 40);

  // Si la carta ocupa todo y no hay bandas, forzamos esquinas
  const fallbackRegions = [
    { name: "tl", x1: 0,     y1: 0,     x2: w*0.30, y2: h*0.22 },
    { name: "tr", x1: w*0.70,y1: 0,     x2: w,      y2: h*0.22 },
    { name: "bl", x1: 0,     y1: h*0.78,x2: w*0.30, y2: h      },
    { name: "br", x1: w*0.70,y1: h*0.78,x2: w,      y2: h      },
  ];

  const usableRegions = regions.length ? regions : fallbackRegions;

  // Evitar solapes entre stickers (AABB)
  const placed = [];
  const overlaps = (a, b, pad=10) =>
    !(a.x + a.w + pad < b.x || b.x + b.w + pad < a.x || a.y + a.h + pad < b.y || b.y + b.h + pad < a.y);

  const frag = document.createDocumentFragment();

  // Ponemos un número razonable para que quede “collage” bonito
  const MAX_TO_PLACE = Math.min(items.length, 18);

  for (let i = 0; i < MAX_TO_PLACE; i++) {
    const src = items[i];

    // Intentamos colocar con tamaño adaptado a la región
    let placedOk = false;

    for (let attempt = 0; attempt < 50 && !placedOk; attempt++) {
      const reg = usableRegions[Math.floor(Math.random() * usableRegions.length)];

      const regW = reg.x2 - reg.x1;
      const regH = reg.y2 - reg.y1;

      // Tamaño adaptado: si la banda es pequeña, reduce
      const base = Math.min(regW, regH);
      let size = Math.max(55, Math.min(150, base * (0.75 + Math.random() * 0.25)));

      // Si es una banda superior/inferior muy bajita, reduce más
      if (reg.name === "top" || reg.name === "bottom") size = Math.min(size, regH - 8);
      if (reg.name === "left" || reg.name === "right") size = Math.min(size, regW - 8);

      // Si la región es demasiado pequeña, saltamos a otra
      if (size < 45) continue;

      const x = reg.x1 + Math.random() * Math.max(1, regW - size);
      const y = reg.y1 + Math.random() * Math.max(1, regH - size);

      const rect = { x, y, w: size, h: size };

      // Evitar solape con otros stickers
      let collides = false;
      for (const p of placed) {
        if (overlaps(rect, p, 10)) { collides = true; break; }
      }
      if (collides) continue;

      // OK: creamos la imagen
      const img = new Image();
      img.src = src;
      img.className = "sticker";
      img.style.width = `${size}px`;
      img.style.left = `${x}px`;
      img.style.top = `${y}px`;

      const rot = (Math.random() * 34 - 17).toFixed(1);
      const scale = (0.95 + Math.random() * 0.25).toFixed(2);
      const opacity = (0.60 + Math.random() * 0.30).toFixed(2);

      img.style.transform = `rotate(${rot}deg) scale(${scale})`;
      img.style.opacity = opacity;

      placed.push(rect);
      frag.appendChild(img);
      placedOk = true;
    }
  }

  collage.appendChild(frag);
}


 // _-------------------------
const params = new URLSearchParams(location.search);
const para = params.get("para");
if (para) toName.textContent = para;

// Ajustes clave
const OPEN_END = 0.72;     // hasta aquí se "abre" el sobre
const REVEAL_START = 0.72; // desde aquí empieza a desaparecer sobre / aparecer carta

function setVars(p) {
  const openRaw = clamp(p / OPEN_END, 0, 1);
  const open = easeInOutQuad(openRaw);

  const revealRaw = clamp((p - REVEAL_START) / (1 - REVEAL_START), 0, 1);
  const reveal = easeInOutQuad(revealRaw);

  // Solapa
  const flapAngle = -180 * open;

  // Sobre desaparece al final
  const envOpacity = 1 - reveal;
  const envScale = 1 - reveal * 0.03; // mini efecto de “se va”
  const envLift = -(open * 6) + (reveal * 8);

  // Carta aparece al final
  const letterOpacity = reveal;
  const letterY = (1 - reveal) * 28;
  const letterBlur = (1 - reveal) * 6;

  // Hint se va rápido
  const hintOpacity = clamp(1 - open * 1.15, 0, 1);

  document.documentElement.style.setProperty("--p", open.toFixed(4));
  document.documentElement.style.setProperty("--flapAngle", `${flapAngle.toFixed(2)}deg`);
  document.documentElement.style.setProperty("--envOpacity", envOpacity.toFixed(3));
  document.documentElement.style.setProperty("--envScale", envScale.toFixed(4));
  document.documentElement.style.setProperty("--envLift", `${envLift.toFixed(1)}px`);

  document.documentElement.style.setProperty("--letterOpacity", letterOpacity.toFixed(3));
  document.documentElement.style.setProperty("--letterY", `${letterY.toFixed(1)}px`);
  document.documentElement.style.setProperty("--letterBlur", `${letterBlur.toFixed(2)}px`);

  document.documentElement.style.setProperty("--hintOpacity", hintOpacity.toFixed(3));

  // Activar interacción de la carta solo cuando ya es visible
  letterSection.style.pointerEvents = reveal > 0.85 ? "auto" : "none";

  // Cambiar fondo a foto cuando la carta empieza a aparecer
  if (reveal > 0.15) document.body.classList.add("photoBg");
  else document.body.classList.remove("photoBg");

  // ---- Collage: aparece con la carta y se genera al entrar ----
  const collageOpacity = clamp((reveal - 0.10) / 0.25, 0, 1);
  document.documentElement.style.setProperty("--collageOpacity", collageOpacity.toFixed(3));

  if (reveal > 0.12 && !collageShown) {
    collageShown = true;
    buildCollage();
  }
  if (reveal < 0.05 && collageShown) {
    collageShown = false;
    if (collage) collage.innerHTML = "";
  }
}

let ticking = false;

function update() {
  ticking = false;

  const rect = scene.getBoundingClientRect();
  const total = scene.offsetHeight - window.innerHeight;
  const scrolled = clamp(-rect.top, 0, total);
  const p = total <= 0 ? 1 : scrolled / total;

  setVars(p);
}

function onScroll() {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(update);
  }
}

window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", () => {
  update();
  // si el collage está visible, lo recolocamos para que no quede raro tras resize
  const op = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--collageOpacity")) || 0;
  if (op > 0.2) buildCollage();
});

update();