// Finds lyrics on LRCLIB (https://lrclib.net), a free community lyrics database.
// No API key is needed. Docs: https://lrclib.net/docs
//
// Matching is deliberately strict: showing no lyrics is better than showing the wrong song's.

const BASE = "https://lrclib.net/api";
const HEADERS = { "User-Agent": "MusicPlayerMERN/1.0 (personal learning project)" };

// Lowercase letters and digits only, for comparing text
const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, "");
// Words of 4+ characters (used to compare artist names)
const words = (s) => String(s || "").toLowerCase().split(/[^\p{L}\p{M}\p{N}]+/u).filter((w) => w.length >= 4);

// Removes junk that download sites add: "[iSongs.info]", "-SenSongsMp3.Co", "(www.site.com)"
function cleanText(raw) {
  return String(raw || "")
    .replace(/\.(mp3|m4a|aac|flac|wav|ogg|opus)$/i, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/\(?\s*\b(?:www\.)?[a-z0-9]+(?:\.[a-z0-9]+)*\.(?:com|co|in|info|net|org|me|fm|cc|io)\b\s*\)?/gi, " ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// "[iSongs.info] 04 - Ammaadi" -> "Ammaadi"
function cleanTitle(raw) {
  return cleanText(raw)
    .replace(/\(\s*(?:from|film|movie|original motion picture)\b[^)]*\)/gi, " ")
    .replace(/^\s*\d{1,3}\s*[-._)]\s*/, "")
    .replace(/^[\s\-–_.,]+|[\s\-–_.,]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// "Vijay Prakash, Devan Ekambaram" -> ["Vijay Prakash", "Devan Ekambaram"]
function artistList(raw) {
  const t = cleanText(raw);
  if (!t || /^unknown artist$/i.test(t)) return [];
  const parts = t.split(/\s*(?:,|&|;|\/|\+|\bfeat\.?\s|\bft\.?\s)\s*/i).map((s) => s.trim()).filter(Boolean);
  return [...new Set(parts)];
}

const mainArtist = (raw) => artistList(raw)[0] || "";

const usable = (c) => !!c && !c.instrumental && !!(c.syncedLyrics || c.plainLyrics);

// 2 = same title, 1 = same title plus a few extra words, 0 = different song
function titleMatch(ours, theirs) {
  const x = norm(cleanTitle(ours));
  const y = norm(cleanTitle(theirs));
  if (!x || !y) return 0;
  if (x === y) return 2;
  const [s, l] = x.length < y.length ? [x, y] : [y, x];
  return l.includes(s) && s.length / l.length >= 0.75 ? 1 : 0;
}

// Does the result's artist share a name with any of our artists?
function sameArtist(ours, theirs) {
  const t = norm(theirs);
  if (!t) return false;
  const tw = new Set(words(theirs));
  return ours.some((a) => {
    const n = norm(a);
    return n && (t.includes(n) || n.includes(t) || words(a).some((w) => tw.has(w)));
  });
}

// Chooses the best search result, or null when none is convincing.
//   - the title must match
//   - the song length must be close (a different length usually means a different version)
//   - the artist should match; if it doesn't, the title and length must match almost exactly
function pickBest(candidates, track, title, artists) {
  const dur = track.duration || 0;
  const scored = [];

  for (const c of candidates || []) {
    if (!usable(c)) continue;
    const ts = titleMatch(title, c.trackName);
    if (!ts) continue;

    const artistOk = artists.length ? sameArtist(artists, c.artistName) : null; // null = we don't know our artist
    const diff = dur > 0 && c.duration ? Math.abs(c.duration - dur) : null;

    if (diff === null) {
      if (!(ts === 2 && artistOk === true)) continue;
    } else if (artistOk === true) {
      if (diff > 8) continue;
    } else if (artistOk === false) {
      if (!(ts === 2 && diff <= 2)) continue;
    } else if (!(ts === 2 && diff <= 4)) {
      continue;
    }

    scored.push({
      c,
      rank: (diff === null ? 10 : diff) + (ts === 2 ? 0 : 3) + (c.syncedLyrics ? 0 : 5) + (artistOk === true ? 0 : 2),
    });
  }
  scored.sort((a, b) => a.rank - b.rank);
  return scored[0]?.c || null;
}

async function getJson(path, params) {
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(10000),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LRCLIB responded with ${res.status}`);
  return res.json();
}

// Returns { synced, plain, source } or null when nothing convincing was found.
// Throws if LRCLIB cannot be reached.
async function findLyrics(track) {
  const title = cleanTitle(track.title);
  if (!title) return null;
  const artists = artistList(track.artist);
  const artist = artists[0] || "";
  const album = cleanText(track.album).replace(/\s*\(\d{4}\)\s*$/, "");
  const dur = Math.round(track.duration || 0);

  let hit = null;

  // 1) Exact lookup (precise, but needs everything to match)
  if (artist && album && dur > 0) {
    const exact = await getJson("/get", { artist_name: artist, track_name: title, album_name: album, duration: dur });
    if (usable(exact)) hit = exact;
  }
  // 2) Search by title + artist
  if (!hit && artist) hit = pickBest(await getJson("/search", { track_name: title, artist_name: artist }), track, title, artists);
  // 3) Search by title only (artist tags are often missing or spelled differently)
  if (!hit) hit = pickBest(await getJson("/search", { track_name: title }), track, title, artists);
  // 4) Free-text search
  if (!hit && artist) hit = pickBest(await getJson("/search", { q: `${title} ${artist}` }), track, title, artists);

  return hit ? { synced: hit.syncedLyrics || "", plain: hit.plainLyrics || "", source: "lrclib" } : null;
}

module.exports = { findLyrics, cleanTitle, cleanText, mainArtist, artistList, pickBest, titleMatch };
