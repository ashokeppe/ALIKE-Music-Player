import { startWeather, stopWeather } from "./weather.js";
import { WALLPAPERS, wallpaperUrl } from "./wallpapers.js";

// The available themes. Their colors are defined in theme.css under [data-theme="<id>"].
// "custom" is the picture theme: the picture is chosen from the computer and saved in this browser.
export const THEMES = [
  { id: "auto", short: "Auto", name: "Auto (match computer)", swatch: ["linear-gradient(135deg,#121212 50%,#f4f5f7 50%)", "#4ade80"] },
  { id: "dark", short: "Dark", name: "Dark", swatch: ["#121212", "#4ade80"] },
  { id: "black", short: "Black", name: "AMOLED Black", swatch: ["#000000", "#4ade80"] },
  { id: "light", short: "Light", name: "Light", swatch: ["#f4f5f7", "#16a34a"] },
  { id: "midnight", short: "Midnight", name: "Midnight Blue", swatch: ["#0b1220", "#38bdf8"] },
  { id: "purple", short: "Purple", name: "Purple Haze", swatch: ["#150f1f", "#c084fc"] },
  { id: "sunset", short: "Sunset", name: "Sunset", swatch: ["#1a100d", "#fb923c"] },
  // Animated themes (their scenes are drawn by backdrop.js / backdrop.css)
  { id: "aurora", short: "Aurora", name: "Aurora", group: "animated", swatch: ["linear-gradient(135deg,#0b1d3a,#19e6a0 55%,#8a4dff)", "#34f5b0"] },
  { id: "synthwave", short: "Synthwave", name: "Synthwave", group: "animated", swatch: ["linear-gradient(180deg,#3b1a72,#ff3d9a 70%,#ff9a5c)", "#ff4fb3"] },
  { id: "starry", short: "Starry", name: "Starry Night", group: "animated", swatch: ["radial-gradient(circle at 70% 30%,#5b6bd6,#0a1030 60%)", "#a5b4ff"] },
  { id: "rain", short: "Lo-fi Rain", name: "Lo-fi Rain", group: "animated", swatch: ["linear-gradient(180deg,#0b1018,#2a3b52)", "#7fb2ff"] },
  { id: "ocean", short: "Ocean", name: "Ocean Waves", group: "animated", swatch: ["linear-gradient(180deg,#071a2f,#1b6a8a)", "#4fd1e8"] },
  { id: "weather", short: "Weather", name: "Live Weather", group: "animated", swatch: ["linear-gradient(180deg,#2b7fd8,#6bb7f0 55%,#3a4858)", "#7cc4ff"] },
  // Live wallpapers (second set)
  { id: "sakura", short: "Blossom", name: "Cherry Blossom", group: "live", swatch: ["linear-gradient(180deg,#4a1d5e,#c25a8a 70%,#f7b2a4)", "#ff9fc4"] },
  { id: "fireflies", short: "Fireflies", name: "Fireflies", group: "live", swatch: ["linear-gradient(180deg,#02070a,#0d2a1b)", "#c8ff6b"] },
  { id: "lava", short: "Lava Lamp", name: "Lava Lamp", group: "live", swatch: ["linear-gradient(135deg,#3a0d3a,#ff3d6e 60%,#ffb03b)", "#ff8a3d"] },
  { id: "warp", short: "Warp", name: "Warp Speed", group: "live", swatch: ["radial-gradient(circle,#4a63c9,#03040c 70%)", "#9ec1ff"] },
  { id: "matrix", short: "Matrix", name: "Matrix Code", group: "live", swatch: ["linear-gradient(180deg,#000504,#0b4a2a)", "#2cff88"] },
  { id: "bars", short: "Waves", name: "Sound Waves", group: "live", swatch: ["linear-gradient(180deg,#1a0838,#7a5cff 60%,#ff4fd8)", "#19e6ff"] },
];

const KEY = "theme";
const IMG = "theme-image";
const ACC = "theme-accent";
const WALL = "theme-wallpaper";
const MOTION = "theme-motion";
const mq = window.matchMedia("(prefers-color-scheme: light)");
const root = document.documentElement;

const read = (key) => {
  try {
    return localStorage.getItem(key) || "";
  } catch {
    return "";
  }
};

export const getCustomImage = () => read(IMG);

export function getTheme() {
  const t = read(KEY);
  if (t === "custom") return getCustomImage() ? "custom" : "dark";
  return THEMES.some((x) => x.id === t) ? t : "dark";
}

const resolve = (t) => (t === "auto" ? (mq.matches ? "light" : "dark") : t);

// Hands the saved picture (and its main color) to the CSS
function syncCustomVars() {
  const img = getCustomImage();
  if (img) {
    root.style.setProperty("--custom-bg", `url("${img}")`);
    root.style.setProperty("--custom-accent", read(ACC) || "#4ade80");
  } else {
    root.style.removeProperty("--custom-bg");
    root.style.removeProperty("--custom-accent");
  }
}

export function applyTheme(t) {
  syncCustomVars();
  root.setAttribute("data-theme", resolve(t));
  if (t === "weather") startWeather(); // live weather scene
  else stopWeather();
  try {
    localStorage.setItem(KEY, t);
  } catch {
    /* ignore */
  }
}

// ---- Custom picture ----
const loadImage = (file) =>
  new Promise((ok, fail) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      ok(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      fail(new Error("That picture format isn't supported. Try a JPG, PNG or WebP."));
    };
    img.src = url;
  });

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h * 60, s, l];
}

// The most "colorful" hue in the picture becomes the theme's accent color
function dominantAccent(source) {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, 32, 32);
  const { data } = ctx.getImageData(0, 0, 32, 32);
  const buckets = new Array(36).fill(0);
  for (let i = 0; i < data.length; i += 4) {
    const [h, s, l] = rgbToHsl(data[i], data[i + 1], data[i + 2]);
    if (s < 0.25 || l < 0.18 || l > 0.85) continue; // skip grays, near-black and near-white
    buckets[Math.floor(h / 10) % 36] += s * (1 - Math.abs(l - 0.5));
  }
  let best = 0;
  for (let i = 1; i < 36; i++) if (buckets[i] > buckets[best]) best = i;
  return buckets[best] ? `hsl(${best * 10 + 5} 72% 62%)` : "#4ade80";
}

// Shrinks the chosen picture so it fits in the browser's storage, saves it and switches to it
export async function setCustomImage(file) {
  if (!file || !file.type.startsWith("image/")) throw new Error("Please choose a picture (JPG, PNG, WebP…).");
  const img = await loadImage(file);
  const w0 = img.naturalWidth;
  const h0 = img.naturalHeight;

  let saved = false;
  for (const [max, quality] of [[1920, 0.82], [1440, 0.7], [1024, 0.6]]) {
    const scale = Math.min(1, max / Math.max(w0, h0));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(w0 * scale));
    c.height = Math.max(1, Math.round(h0 * scale));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    try {
      localStorage.setItem(IMG, c.toDataURL("image/jpeg", quality));
      try { localStorage.setItem(ACC, dominantAccent(c)); } catch { /* accent is optional */ }
      saved = true;
      break;
    } catch {
      /* too big for the storage: try a smaller version */
    }
  }
  if (!saved) throw new Error("That picture is too large to save in the browser. Try a smaller one.");
  try { localStorage.removeItem(WALL); } catch { /* ignore */ }
  applyTheme("custom");
}

export const getWallpaper = () => read(WALL);

// A built-in wallpaper is stored like a chosen picture, plus its id and a matching accent color
export function setWallpaper(id) {
  const w = WALLPAPERS.find((x) => x.id === id);
  if (!w) return;
  try {
    localStorage.setItem(IMG, wallpaperUrl(id));
    localStorage.setItem(ACC, w.accent);
    localStorage.setItem(WALL, id);
  } catch {
    /* storage unavailable */
  }
  applyTheme("custom");
}

export function removeCustomImage() {
  const wasCustom = read(KEY) === "custom";
  try {
    localStorage.removeItem(IMG);
    localStorage.removeItem(ACC);
    localStorage.removeItem(WALL);
  } catch {
    /* ignore */
  }
  if (wasCustom) applyTheme("dark");
  else syncCustomVars();
}

// Animations can be paused from the theme menu
export const getMotion = () => read(MOTION) !== "off";

export function setMotion(on) {
  if (on) root.removeAttribute("data-motion");
  else root.setAttribute("data-motion", "off");
  try {
    localStorage.setItem(MOTION, on ? "on" : "off");
  } catch {
    /* ignore */
  }
}

// Apply the saved theme right away, and follow the computer's light/dark setting while "Auto" is selected
applyTheme(getTheme());
if (!getMotion()) root.setAttribute("data-motion", "off");
mq.addEventListener?.("change", () => {
  if (getTheme() === "auto") root.setAttribute("data-theme", resolve("auto"));
});
