// Live weather for the "Live Weather" theme.
// Data comes from Open-Meteo (https://open-meteo.com): free, no account and no API key.

const LOC = "weather-loc"; // the chosen place: { lat, lon, name }
const LAST = "weather-last"; // the last weather received: { cond, isDay, temp, place, at }
const REFRESH_MS = 15 * 60 * 1000;
const root = document.documentElement;

export const LABELS = {
  clear: "Clear sky", partly: "Partly cloudy", cloudy: "Cloudy", fog: "Fog",
  drizzle: "Drizzle", rain: "Rain", snow: "Snow", thunder: "Thunderstorm",
};

// WMO weather codes (used by Open-Meteo) -> the scene to show
export function conditionFor(code) {
  if (code === 0 || code === 1) return "clear";
  if (code === 2) return "partly";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "drizzle";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95 && code <= 99) return "thunder";
  return "cloudy";
}

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
};

export const getLocation = () => readJson(LOC);

let last = readJson(LAST);
let timer = null;
let requestId = 0;
const listeners = new Set();

// Lets the theme menu show the temperature and place; returns a function that stops listening
export function onWeather(fn) {
  listeners.add(fn);
  if (last) fn(last);
  return () => listeners.delete(fn);
}

function show(data) {
  last = data;
  root.setAttribute("data-weather", data.cond);
  root.setAttribute("data-daylight", data.isDay ? "day" : "night");
  listeners.forEach((fn) => fn(data));
}

// Asks the browser for the current position (the browser shows its own permission question)
export function detectLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("This browser can't share your location. Search for a city instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, name: "My location" }),
      (e) =>
        reject(new Error(e.code === 1
          ? "Location permission is blocked. Allow it in the browser, or search for a city."
          : "Could not get your location. Search for a city instead.")),
      { timeout: 10000, maximumAge: 600000 }
    );
  });
}

export async function searchPlaces(query) {
  const q = String(query || "").trim();
  if (!q) return [];
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`);
  if (!res.ok) throw new Error("Could not search for places right now.");
  const data = await res.json();
  return (data.results || []).map((r) => ({
    lat: r.latitude,
    lon: r.longitude,
    name: [r.name, r.admin1, r.country].filter(Boolean).join(", "),
  }));
}

async function fetchCurrent(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("weather request failed");
  const { current } = await res.json();
  if (!current) throw new Error("no weather data");
  return {
    cond: conditionFor(current.weather_code),
    isDay: current.is_day === 1,
    temp: current.temperature_2m,
    place: loc.name,
    at: Date.now(),
  };
}

export async function refresh() {
  const loc = getLocation();
  if (!loc) return;
  const id = ++requestId;
  try {
    const data = await fetchCurrent(loc);
    if (id !== requestId) return; // a newer request (another place) has taken over
    writeJson(LAST, data);
    show(data);
  } catch {
    /* offline or the service is busy: keep showing the last known weather */
  }
}

export function setLocation(loc) {
  writeJson(LOC, loc);
  refresh();
}

const onVisible = () => {
  if (document.visibilityState === "visible" && (!last || Date.now() - last.at > 10 * 60 * 1000)) refresh();
};

export function startWeather() {
  // Show the last known weather (or day/night by the clock) right away, then update it
  if (last) {
    show(last);
  } else {
    const h = new Date().getHours();
    show({ cond: "clear", isDay: h >= 6 && h < 18, temp: null, place: "", at: 0 });
  }
  refresh();
  clearInterval(timer);
  timer = setInterval(refresh, REFRESH_MS);
  document.addEventListener("visibilitychange", onVisible);
}

export function stopWeather() {
  clearInterval(timer);
  timer = null;
  document.removeEventListener("visibilitychange", onVisible);
  root.removeAttribute("data-weather");
  root.removeAttribute("data-daylight");
}
