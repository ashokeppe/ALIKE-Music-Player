// Built-in wallpapers for the "custom picture" theme. They are drawn as small SVG images (no downloads, no files).

const W = 1600;
const H = 900;
const f = (n) => Math.round(n * 10) / 10;

// small repeatable random numbers, so a wallpaper always looks the same
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const wrap = (defs, body) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='xMidYMid slice'><defs>${defs}</defs>${body}</svg>`;
const grad = (id, stops, x2 = 0, y2 = 1) =>
  `<linearGradient id='${id}' x1='0' y1='0' x2='${x2}' y2='${y2}'>${stops.map(([o, c]) => `<stop offset='${o}' stop-color='${c}'/>`).join("")}</linearGradient>`;
const bg = (fill) => `<rect width='${W}' height='${H}' fill='${fill}'/>`;

function stars(r, n, y0, y1) {
  let out = "";
  for (let i = 0; i < n; i++) {
    out += `<circle cx='${f(r() * W)}' cy='${f(y0 + r() * (y1 - y0))}' r='${f(0.5 + r() * 1.4)}' fill='#fff' opacity='${f(0.25 + r() * 0.7)}'/>`;
  }
  return out;
}

function ridge(r, base, amp, color, step = 70) {
  const pts = [];
  for (let x = -step; x <= W + step; x += step) pts.push(`${x},${f(base - amp * (0.35 + r() * 0.65))}`);
  return `<polygon points='-70,${H} ${pts.join(" ")} ${W + 70},${H}' fill='${color}'/>`;
}

const mountains = () => {
  const r = rng(7);
  return wrap(
    grad("s", [[0, "#1d1240"], [0.45, "#7a3a86"], [0.8, "#ff9a5c"], [1, "#ffd6a0"]]),
    bg("url(#s)") + stars(r, 60, 0, 330) +
      "<circle cx='1160' cy='560' r='120' fill='#ffd9a0' opacity='.25'/><circle cx='1160' cy='560' r='78' fill='#ffe7bd'/>" +
      ridge(r, 640, 170, "#5a3a86") + ridge(r, 760, 190, "#3b2468") + ridge(r, 880, 210, "#1c1038")
  );
};

const city = () => {
  const r = rng(21);
  const layer = (minH, maxH, fill, windows) => {
    let x = -20;
    let out = "";
    while (x < W) {
      const w = 40 + r() * 70;
      const h = minH + r() * (maxH - minH);
      out += `<rect x='${f(x)}' y='${f(H - h)}' width='${f(w)}' height='${f(h)}' fill='${fill}'/>`;
      if (windows) {
        for (let wy = H - h + 16; wy < H - 12; wy += 26) {
          for (let wx = x + 8; wx < x + w - 12; wx += 18) {
            if (r() < 0.22) out += `<rect x='${f(wx)}' y='${f(wy)}' width='6' height='9' fill='#ffd86b' opacity='${f(0.35 + r() * 0.6)}'/>`;
          }
        }
      }
      x += w + 4 + r() * 8;
    }
    return out;
  };
  return wrap(
    grad("s", [[0, "#04061a"], [0.6, "#172463"], [1, "#3a4fa0"]]),
    bg("url(#s)") + stars(r, 80, 0, 380) + "<circle cx='1280' cy='170' r='60' fill='#fff3cf'/>" +
      layer(220, 480, "#0f1740", false) + layer(120, 380, "#070c26", true)
  );
};

const waves = () => {
  const r = rng(5);
  let paths = "";
  for (let i = 0; i < 10; i++) {
    const y0 = 250 + i * 55;
    const amp = 40 + r() * 60;
    const ph = r() * 6.28;
    const fr = 0.004 + r() * 0.004;
    let d = "";
    for (let x = 0; x <= W; x += 20) d += `${x === 0 ? "M" : "L"}${x},${f(y0 + Math.sin(x * fr + ph) * amp)} `;
    paths += `<path d='${d}' fill='none' stroke='url(#w)' stroke-width='${f(2 + r() * 5)}' opacity='${f(0.35 + r() * 0.55)}'/>`;
  }
  return wrap(
    grad("b", [[0, "#0a0520"], [1, "#22093f"]]) +
      "<linearGradient id='w' x1='0' y1='0' x2='1' y2='0'><stop offset='0' stop-color='#ff2fd0'/><stop offset='.5' stop-color='#7a5cff'/><stop offset='1' stop-color='#19e6ff'/></linearGradient>",
    bg("url(#b)") + "<circle cx='800' cy='420' r='360' fill='#ff2fd0' opacity='.07'/>" + paths
  );
};

const forest = () => {
  const r = rng(11);
  const pines = (baseY, minH, maxH, fill, gap) => {
    let out = "";
    for (let x = -40; x < W + 40; x += gap + r() * gap) {
      const h = minH + r() * (maxH - minH);
      const w = h * 0.38;
      out += `<polygon points='${f(x)},${f(baseY - h)} ${f(x - w)},${baseY} ${f(x + w)},${baseY}' fill='${fill}'/>`;
    }
    return out + `<rect x='0' y='${baseY - 2}' width='${W}' height='${H - baseY + 2}' fill='${fill}'/>`;
  };
  const fog = (y) => `<rect x='0' y='${y}' width='${W}' height='140' fill='url(#fog)'/>`;
  return wrap(
    grad("s", [[0, "#0a2326"], [0.55, "#2c6a5a"], [1, "#c4e6cf"]]) +
      "<linearGradient id='fog' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='0'/><stop offset='.5' stop-color='#e8fff3' stop-opacity='.35'/><stop offset='1' stop-color='#fff' stop-opacity='0'/></linearGradient>",
    bg("url(#s)") + "<circle cx='1180' cy='230' r='70' fill='#f3ffe9' opacity='.8'/>" +
      pines(640, 160, 330, "#2d6b5b", 46) + fog(520) + pines(760, 200, 400, "#17453f", 38) + fog(640) + pines(900, 240, 470, "#0b2623", 34)
  );
};

const dunes = () => {
  const dune = (base, amp, fill, seed) => {
    const q = rng(seed);
    let d = `M-50,${H} L-50,${base} `;
    for (let x = -50; x < W + 150; x += 400) d += `Q${x + 200},${f(base - amp * (0.6 + q() * 0.8))} ${x + 400},${f(base + (q() - 0.5) * amp * 0.5)} `;
    return `<path d='${d}L${W + 150},${H} Z' fill='${fill}'/>`;
  };
  return wrap(
    grad("s", [[0, "#ff7a5a"], [0.5, "#ffb98a"], [1, "#ffe6bd"]]),
    bg("url(#s)") + "<circle cx='430' cy='360' r='130' fill='#fff1c9' opacity='.35'/><circle cx='430' cy='360' r='86' fill='#fff6dc'/>" +
      dune(600, 130, "#e8a469", 1) + dune(700, 150, "#c77a4c", 2) + dune(810, 150, "#8f4f36", 3)
  );
};

const galaxy = () => {
  const r = rng(99);
  let st = "";
  for (let i = 0; i < 260; i++) st += `<circle cx='${f(r() * W)}' cy='${f(r() * H)}' r='${f(0.5 + r() * 1.6)}' fill='#fff' opacity='${f(0.25 + r() * 0.75)}'/>`;
  const neb = (id, c) => `<radialGradient id='${id}'><stop offset='0' stop-color='${c}' stop-opacity='.55'/><stop offset='1' stop-color='${c}' stop-opacity='0'/></radialGradient>`;
  return wrap(
    neb("a", "#6a2cff") + neb("b", "#1f8fff") + neb("c", "#ff3d9a"),
    bg("#04040f") +
      "<ellipse cx='480' cy='360' rx='700' ry='420' fill='url(#a)'/><ellipse cx='1150' cy='560' rx='680' ry='400' fill='url(#b)'/><ellipse cx='880' cy='220' rx='520' ry='300' fill='url(#c)'/>" + st
  );
};

const ocean = () => {
  let lines = "";
  for (let i = 0; i < 16; i++) {
    const y = 610 + i * 17 + i * i * 0.8;
    const w = 260 + i * 70;
    lines += `<rect x='${800 - w / 2}' y='${f(y)}' width='${w}' height='${f(3 + i * 0.4)}' rx='2' fill='#ffb06e' opacity='${f(0.75 - i * 0.04)}'/>`;
  }
  return wrap(
    grad("s", [[0, "#1b1040"], [0.5, "#c2358f"], [0.7, "#ff9a5c"], [1, "#ffd0a0"]], 0, 0.67) + grad("o", [[0, "#4a2478"], [1, "#12072a"]]),
    bg("url(#s)") + "<circle cx='800' cy='600' r='150' fill='#fff0c8' opacity='.25'/><circle cx='800' cy='600' r='105' fill='#ffe6a8'/>" +
      `<rect x='0' y='600' width='${W}' height='${H - 600}' fill='url(#o)'/>` + lines
  );
};

const aurora = () => {
  const r = rng(17);
  let st = "";
  for (let i = 0; i < 120; i++) st += `<circle cx='${f(r() * W)}' cy='${f(r() * 520)}' r='${f(0.5 + r() * 1.3)}' fill='#fff' opacity='${f(0.2 + r() * 0.7)}'/>`;
  return wrap(
    "<filter id='bl' x='-30%' y='-30%' width='160%' height='160%'><feGaussianBlur stdDeviation='55'/></filter>" + grad("b", [[0, "#030816"], [1, "#0b1f3a"]]),
    bg("url(#b)") + st +
      "<g filter='url(#bl)'><path d='M-100,420 C300,150 600,520 900,260 S1400,160 1700,340 L1700,520 C1300,420 1000,600 700,470 S200,560 -100,520 Z' fill='#19e6a0' opacity='.55'/>" +
      "<path d='M-100,360 C250,260 650,380 950,200 S1450,260 1700,180 L1700,300 C1350,360 1000,300 700,380 S250,330 -100,430 Z' fill='#8a4dff' opacity='.45'/></g>" +
      `<rect x='0' y='760' width='${W}' height='140' fill='#02060f'/>`
  );
};

export const WALLPAPERS = [
  { id: "mountains", name: "Mountain dusk", accent: "#ffb067", svg: mountains },
  { id: "city", name: "City night", accent: "#ffd86b", svg: city },
  { id: "waves", name: "Neon waves", accent: "#ff4fd8", svg: waves },
  { id: "forest", name: "Forest mist", accent: "#7be0a8", svg: forest },
  { id: "dunes", name: "Desert dunes", accent: "#ffb36b", svg: dunes },
  { id: "galaxy", name: "Galaxy", accent: "#b18cff", svg: galaxy },
  { id: "ocean", name: "Ocean sunset", accent: "#ff7ab8", svg: ocean },
  { id: "aurora", name: "Northern lights", accent: "#5dffc0", svg: aurora },
];

const cache = {};
export function wallpaperUrl(id) {
  if (!cache[id]) {
    const w = WALLPAPERS.find((x) => x.id === id);
    cache[id] = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(w.svg());
  }
  return cache[id];
}
