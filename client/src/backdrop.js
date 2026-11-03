import "./backdrop.css";

// Builds the animated scenes behind the app. Which one is visible depends on the theme (see backdrop.css).
const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

function el(tag, cls, vars) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  for (const [k, v] of Object.entries(vars || {})) e.style.setProperty(k, v);
  return e;
}

const group = (cls, children) => {
  const g = el("div", cls);
  children.forEach((c) => g.appendChild(c));
  return g;
};

function starLayer(cls, count, blur) {
  const colors = ["#ffffff", "#ffffff", "#cfe0ff", "#ffe9c7"];
  const layer = el("i", `star ${cls}`);
  layer.style.boxShadow = Array.from({ length: count }, () =>
    `${rand(0, 100).toFixed(1)}vw ${rand(0, 100).toFixed(1)}vh ${blur} ${pickOne(colors)}`
  ).join(",");
  return layer;
}

// Live weather scene: sky, sun/moon/stars, clouds, rain, snow, fog and lightning.
// backdrop.css shows only the parts that match the current weather (data-weather / data-daylight on <html>).
function buildWeather() {
  const g = el("div", "fx-weather");
  g.appendChild(el("div", "sky"));
  g.appendChild(el("div", "sun"));
  g.appendChild(el("div", "moon"));
  g.appendChild(group("wstars", [starLayer("l1", 90, "0"), starLayer("l2", 45, "0"), starLayer("l3", 18, "2px")]));
  g.appendChild(
    group(
      "clouds",
      [["6%", 1.7, 150, -40], ["20%", 1.1, 110, -15], ["34%", 2.2, 180, -100], ["11%", 0.9, 125, -75], ["27%", 1.4, 140, -125]].map(
        ([top, scale, dur, delay]) => el("i", "c", { "--t": top, "--s": scale, "--d": `${dur}s`, "--w": `${delay}s` })
      )
    )
  );
  g.appendChild(
    group(
      "drops",
      Array.from({ length: 70 }, () =>
        el("i", "", {
          "--x": `${rand(0, 110).toFixed(1)}%`,
          "--h": `${rand(40, 90).toFixed(0)}px`,
          "--o": rand(0.2, 0.55).toFixed(2),
          "--d": `${rand(0.7, 1.4).toFixed(2)}s`,
          "--w": `-${rand(0, 3).toFixed(2)}s`,
        })
      )
    )
  );
  g.appendChild(
    group(
      "snow",
      Array.from({ length: 60 }, () =>
        el("i", "", {
          "--x": `${rand(0, 100).toFixed(1)}%`,
          "--z": `${rand(2, 6).toFixed(1)}px`,
          "--o": rand(0.5, 0.95).toFixed(2),
          "--d": `${rand(7, 15).toFixed(1)}s`,
          "--w": `-${rand(0, 15).toFixed(1)}s`,
          "--dx": `${rand(-6, 6).toFixed(1)}vw`,
        })
      )
    )
  );
  g.appendChild(group("fogs", ["f1", "f2", "f3"].map((c) => el("i", c))));
  g.appendChild(el("div", "flash"));
  g.appendChild(el("div", "veil"));
  return g;
}


// ---- Live wallpapers (second set) ----
const times = (n, fn) => Array.from({ length: n }, (_, i) => fn(i));

// Cherry blossom: petals drift down in front of a pink dusk sky
function buildSakura() {
  const g = el("div", "fx-sakura");
  g.appendChild(el("div", "moon"));
  g.appendChild(el("div", "branch"));
  g.appendChild(
    group(
      "petals",
      times(46, () =>
        el("i", "p", {
          "--x": `${rand(-5, 105).toFixed(1)}%`,
          "--z": `${rand(9, 20).toFixed(0)}px`,
          "--o": rand(0.55, 0.95).toFixed(2),
          "--d": `${rand(9, 18).toFixed(1)}s`,
          "--w": `-${rand(0, 18).toFixed(1)}s`,
          "--dx": `${rand(-14, 14).toFixed(1)}vw`,
        })
      )
    )
  );
  return g;
}

// Fireflies: glowing dots wander over a dark pine forest
function buildFireflies() {
  const g = el("div", "fx-fireflies");
  g.appendChild(el("div", "trees"));
  g.appendChild(
    group(
      "flies",
      times(44, () =>
        el("i", "fly", {
          "--x": `${rand(0, 100).toFixed(1)}%`,
          "--y": `${rand(28, 96).toFixed(1)}%`,
          "--z": `${rand(3, 6).toFixed(1)}px`,
          "--dx": `${rand(-12, 12).toFixed(1)}vw`,
          "--dy": `${rand(-12, 12).toFixed(1)}vh`,
          "--d": `${rand(9, 20).toFixed(1)}s`,
          "--g": `${rand(1.6, 4.2).toFixed(1)}s`,
          "--w": `-${rand(0, 12).toFixed(1)}s`,
        })
      )
    )
  );
  return g;
}

// Lava lamp: soft blobs of color rise and fall
const LAVA = [
  ["#ffb03b", "#ff3d6e"], ["#ff5fa8", "#8a3dff"], ["#ffd34e", "#ff7a2f"], ["#ff3d6e", "#b02cff"],
  ["#ff9a3d", "#ff2f9a"], ["#ffcf5a", "#ff5a3d"], ["#ff4f9a", "#ffa03d"],
];
function buildLava() {
  const g = el("div", "fx-lava");
  g.appendChild(
    group(
      "blobs",
      LAVA.map(([c1, c2], i) =>
        el("i", "b", {
          "--x": `${(6 + i * 13.5 + rand(-4, 4)).toFixed(1)}%`,
          "--z": `${rand(26, 46).toFixed(0)}vmin`,
          "--c1": c1,
          "--c2": c2,
          "--dx": `${rand(-9, 9).toFixed(1)}vw`,
          "--d": `${rand(16, 30).toFixed(1)}s`,
          "--w": `-${rand(0, 24).toFixed(1)}s`,
        })
      )
    )
  );
  return g;
}

// Warp speed: stars stream out from the middle of the screen
function buildWarp() {
  const g = el("div", "fx-warp");
  g.appendChild(
    group(
      "streaks",
      times(110, () =>
        el("i", "", {
          "--a": `${rand(0, 360).toFixed(1)}deg`,
          "--o": rand(0.4, 1).toFixed(2),
          "--d": `${rand(1.4, 3.6).toFixed(2)}s`,
          "--w": `-${rand(0, 3.6).toFixed(2)}s`,
        })
      )
    )
  );
  return g;
}

// Matrix: green characters fall in columns (plain letters and digits, so every device can draw them)
const GLYPHS = "01234567890ABCDEFGHJKLMNPRSTUVWXYZ<>/=+*#";
function buildMatrix() {
  const g = el("div", "fx-matrix");
  const cols = times(34, (i) => {
    const c = el("div", "col", {
      "--x": `${(i * 3 + rand(0, 1.6)).toFixed(1)}%`,
      "--fs": `${Math.round(rand(13, 19))}px`,
      "--o": rand(0.14, 0.48).toFixed(2),
      "--d": `${rand(6, 15).toFixed(1)}s`,
      "--w": `-${rand(0, 15).toFixed(1)}s`,
    });
    c.textContent = times(Math.round(rand(14, 30)), () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)]).join("\n");
    return c;
  });
  cols.forEach((c) => g.appendChild(c));
  return g;
}

// Sound waves: glowing equalizer bars dance above a reflection
function buildBars() {
  const g = el("div", "fx-bars");
  const settings = times(44, () => ({
    "--lo": rand(0.08, 0.3).toFixed(2),
    "--hi": rand(0.45, 1).toFixed(2),
    "--d": `${rand(0.5, 1.5).toFixed(2)}s`,
    "--w": `-${rand(0, 2).toFixed(2)}s`,
  }));
  g.appendChild(el("div", "glowline"));
  g.appendChild(group("eq", settings.map((v) => el("i", "", v))));
  g.appendChild(group("eq mirror", settings.map((v) => el("i", "", v))));
  return g;
}

export function mountBackdrop() {
  if (document.querySelector(".fx")) return;
  const fx = el("div", "fx");
  fx.setAttribute("aria-hidden", "true");

  fx.appendChild(group("fx-aurora", ["a1", "a2", "a3", "a4"].map((c) => el("i", c))));

  fx.appendChild(
    group("fx-synthwave", [
      el("div", "sun"),
      group("grid", [group("plane", [el("div", "pattern")])]),
    ])
  );

  fx.appendChild(
    group("fx-stars", [
      starLayer("l1", 110, "0"),
      starLayer("l2", 60, "0"),
      starLayer("l3", 22, "2px"),
      ...[["58%", "4%", "2s"], ["72%", "26%", "7s"], ["35%", "12%", "13s"]].map(([l, t, d]) =>
        el("i", "shoot", { "--l": l, "--t": t, "--d": d })
      ),
    ])
  );

  fx.appendChild(
    group(
      "fx-rain",
      Array.from({ length: 70 }, () =>
        el("i", "", {
          "--x": `${rand(0, 110).toFixed(1)}%`,
          "--h": `${rand(40, 90).toFixed(0)}px`,
          "--o": rand(0.2, 0.55).toFixed(2),
          "--d": `${rand(0.7, 1.4).toFixed(2)}s`,
          "--w": `-${rand(0, 3).toFixed(2)}s`, // negative delay: drops are already falling when the theme starts
        })
      )
    )
  );

  fx.appendChild(group("fx-ocean", ["w1", "w2", "w3"].map((c) => el("div", `wave ${c}`))));

  fx.appendChild(buildWeather());
  fx.appendChild(buildSakura());
  fx.appendChild(buildFireflies());
  fx.appendChild(buildLava());
  fx.appendChild(buildWarp());
  fx.appendChild(buildMatrix());
  fx.appendChild(buildBars());

  document.body.prepend(fx);
}
