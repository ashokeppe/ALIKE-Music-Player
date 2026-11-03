import api from "./api.js";

// ---- loading every song (the server sends them 100 at a time) ----
export async function fetchAllTracks() {
  const first = await api.get("/tracks", { params: { page: 1, limit: 100 } });
  const { tracks, totalPages } = first.data;
  const rest = totalPages > 1
    ? await Promise.all(Array.from({ length: totalPages - 1 }, (_, i) => api.get("/tracks", { params: { page: i + 2, limit: 100 } })))
    : [];
  const byId = new Map();
  [...tracks, ...rest.flatMap((r) => r.data.tracks)].forEach((t) => byId.set(t._id, t));
  return [...byId.values()];
}

// ---- album names ----
const DOMAIN = /\(?\s*\b(?:www\.)?[a-z0-9]+(?:\.[a-z0-9]+)*\.(?:com|co|in|info|net|org|me|fm|cc|io)\b\s*\)?/gi;
const natural = (a, b) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });

// "Radhe Shyam - (2021)" -> { name: "Radhe Shyam", year: "2021" }
export function splitAlbum(raw) {
  let s = String(raw || "").replace(/\[[^\]]*\]/g, " ").replace(DOMAIN, " ").replace(/\s+/g, " ").trim();
  let year = "";
  const m = s.match(/^(.*?)[\s\-–]*\(\s*((?:19|20)\d{2})\s*\)\s*$/);
  if (m) {
    s = m[1];
    year = m[2];
  }
  return { name: s.replace(/[\s\-–_.,]+$/g, "").trim(), year };
}

// the same album written slightly differently (case, punctuation, year) gets the same key
export const albumKey = (name) =>
  String(name || "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "unknown";

const mainArtist = (a) => String(a || "").split(/\s*(?:,|&|;|\/|\bfeat\.?\s|\bft\.?\s)\s*/i)[0].trim();

// the artist most songs belong to, or "Various artists"
function albumArtist(tracks) {
  const counts = new Map();
  tracks.forEach((t) => {
    const a = mainArtist(t.artist) || "Unknown Artist";
    counts.set(a, (counts.get(a) || 0) + 1);
  });
  const [top, n] = [...counts.entries()].sort((x, y) => y[1] - x[1])[0] || ["", 0];
  return n / tracks.length >= 0.6 ? top : "Various artists";
}

// the spelling most songs use; on a tie, one with normal capital letters (not ALL CAPS or all lowercase)
function pickName(variants) {
  const score = (name, count) => count * 10 + (name !== name.toLowerCase() && name !== name.toUpperCase() ? 5 : 0);
  return [...variants.entries()].sort((x, y) => score(y[0], y[1]) - score(x[0], x[1]))[0][0];
}

export function groupAlbums(tracks) {
  const map = new Map();
  for (const t of tracks) {
    const { name, year } = splitAlbum(t.album);
    const key = albumKey(name);
    let a = map.get(key);
    if (!a) {
      a = { key, name: "", year: "", tracks: [], coverUrl: "", latest: 0, variants: new Map() };
      map.set(key, a);
    }
    if (name) a.variants.set(name, (a.variants.get(name) || 0) + 1);
    a.tracks.push(t);
    if (year && !a.year) a.year = year;
    if (!a.coverUrl && t.coverUrl) a.coverUrl = t.coverUrl;
    a.latest = Math.max(a.latest, Date.parse(t.createdAt) || 0);
  }
  const albums = [...map.values()];
  for (const a of albums) {
    a.name = a.variants.size ? pickName(a.variants) : "Unknown album";
    delete a.variants;
    a.tracks.sort((x, y) => natural(x.title, y.title));
    a.artist = albumArtist(a.tracks);
    a.duration = a.tracks.reduce((s, t) => s + (t.duration || 0), 0);
  }
  return albums;
}

export function sortAlbums(albums, mode) {
  const list = [...albums];
  const byName = (a, b) => (a.key === "unknown") - (b.key === "unknown") || natural(a.name, b.name); // "Unknown album" last
  if (mode === "recent") list.sort((a, b) => b.latest - a.latest || byName(a, b));
  else if (mode === "songs") list.sort((a, b) => b.tracks.length - a.tracks.length || byName(a, b));
  else list.sort(byName);
  return list;
}

export const albumMeta = (a) =>
  [a.artist, a.year, `${a.tracks.length} song${a.tracks.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ");

export function fmtTotal(sec) {
  const m = Math.round(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${Math.max(m, 1)} min`;
}
