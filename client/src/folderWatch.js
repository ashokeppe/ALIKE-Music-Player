// Keeps chosen folders in sync with the library: new songs found in them are imported automatically.
//
// It uses the browser's File System Access API (Chrome / Edge on a computer). A web page can only look inside
// a folder while the app is open in the browser, so the folder is checked every minute, when you come back to
// the tab, and when you press "Check now". Songs you delete from the library are NOT imported again.

import api from "./api.js";
import { readTags } from "./readTags.js";
import { showToast } from "./toast.js";

export const watchSupported = typeof window !== "undefined" && "showDirectoryPicker" in window;

const CHECK_MS = 60 * 1000; // how often a watched folder is checked
const SETTLE_MS = 3000; // a new file must stay unchanged this long (so half-copied files are not imported)

// ---- audio files ----
const MIME = {
  mp3: "audio/mpeg", m4a: "audio/mp4", aac: "audio/aac", wav: "audio/wav", flac: "audio/flac",
  ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", weba: "audio/webm",
};
const EXT = /\.(mp3|m4a|aac|wav|flac|ogg|oga|opus|weba)$/i;
const fingerprint = (f) => `${f.name}|${f.size}|${f.lastModified}`; // same recipe as the Import page
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const toAudioFile = (f) => {
  const mime = MIME[f.name.split(".").pop().toLowerCase()];
  if (mime) return f.type === mime ? f : new File([f], f.name, { type: mime, lastModified: f.lastModified });
  return f.type.startsWith("audio/") ? f : null;
};

const probeDuration = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const finish = (v) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const timer = setTimeout(() => finish(0), 4000);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(Number.isFinite(audio.duration) ? Math.round(audio.duration) : 0);
    audio.onerror = () => finish(0);
    audio.src = url;
  });

async function uploadSong(file) {
  const [duration, tags] = await Promise.all([probeDuration(file), readTags(file)]);
  const form = new FormData();
  form.append("duration", duration);
  for (const k of ["title", "artist", "album", "genre"]) if (tags[k]) form.append(k, tags[k]);
  if (tags.cover) form.append("cover", tags.cover);
  form.append("audio", file);
  return (await api.post("/tracks", form)).data;
}

// ---- remembering which file became which library song (shared with the Import page) ----
const knownKey = (userId) => `imported-map:${userId}`;
const loadKnown = (userId) => {
  try {
    const v = JSON.parse(localStorage.getItem(knownKey(userId)) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};
const saveKnown = (userId, map) => {
  try {
    localStorage.setItem(knownKey(userId), JSON.stringify(map));
  } catch {
    /* ignore */
  }
};

async function fetchLibraryIds() {
  const ids = new Set();
  let page = 1;
  let pages = 1;
  do {
    const { data } = await api.get("/tracks", { params: { page, limit: 100 } });
    data.tracks.forEach((t) => ids.add(t._id));
    pages = data.totalPages;
    page++;
  } while (page <= pages);
  return ids;
}

// ---- watched folders are saved in the browser (IndexedDB), because folder handles can't go in localStorage ----
const openDb = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open("music-watch", 1);
    req.onupgradeneeded = () => req.result.createObjectStore("folders", { keyPath: "id" });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

async function db(mode, make) {
  const conn = await openDb();
  return new Promise((resolve, reject) => {
    const req = make(conn.transaction("folders", mode).objectStore("folders"));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const listFolders = async (userId) => (await db("readonly", (s) => s.getAll())).filter((f) => f.userId === userId);
const putFolder = (rec) => db("readwrite", (s) => s.put(rec));
const deleteFolder = (id) => db("readwrite", (s) => s.delete(id));
const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

// ---- status that the screens show ----
const statuses = {};
let version = 0;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn({ ...statuses }, version));
const emit = (id, change) => {
  statuses[id] = { ...statuses[id], ...change };
  notify();
};

export function subscribe(fn) {
  listeners.add(fn);
  fn({ ...statuses }, version);
  return () => listeners.delete(fn);
}

// ---- looking inside a folder ----
async function* walk(dir, depth = 0) {
  for await (const [name, h] of dir.entries()) {
    if (h.kind === "directory") {
      if (depth < 10 && !name.startsWith(".")) yield* walk(h, depth + 1);
    } else if (EXT.test(name)) {
      yield h;
    }
  }
}

async function collect(dir) {
  const out = [];
  for await (const handle of walk(dir)) {
    try {
      const f = await handle.getFile();
      if (f.size > 0) out.push({ handle, name: f.name, size: f.size, modified: f.lastModified, fp: fingerprint(f) });
    } catch {
      /* the file disappeared while scanning */
    }
  }
  return out;
}

// Lets the person choose a folder (Chrome / Edge) and returns its handle and the songs inside it
export async function pickFolder() {
  const handle = await window.showDirectoryPicker({ mode: "read" });
  const files = [];
  for await (const h of walk(handle)) {
    try {
      files.push(await h.getFile());
    } catch {
      /* skip */
    }
  }
  return { handle, files };
}

// ---- checking one folder ----
async function syncFolder(rec, userId) {
  const permission = await rec.handle.queryPermission({ mode: "read" }).catch(() => "denied");
  if (permission !== "granted") return emit(rec.id, { state: "permission" });

  emit(rec.id, { state: "scanning" });
  let files;
  try {
    files = await collect(rec.handle);
  } catch {
    return emit(rec.id, { state: "missing" });
  }

  const seen = new Set(rec.seen);
  let fresh = files.filter((f) => !seen.has(f.fp));
  const idle = (extra = {}) => emit(rec.id, { state: "idle", checkedAt: Date.now(), ...extra });
  if (!fresh.length) return idle({ failed: [] });

  // A file that is still being copied changes size: wait a moment and keep only files that stayed the same
  await sleep(SETTLE_MS);
  const stable = [];
  for (const f of fresh) {
    try {
      const again = await f.handle.getFile();
      if (again.size === f.size && again.lastModified === f.modified) stable.push(f);
    } catch {
      /* gone */
    }
  }
  fresh = stable;
  if (!fresh.length) return idle({ failed: [] });

  // Songs that came in earlier (by hand) and are still in the library are not imported twice
  const known = loadKnown(userId);
  let alive = null;
  if (fresh.some((f) => known[f.fp])) {
    try {
      alive = await fetchLibraryIds();
    } catch {
      return emit(rec.id, { state: "offline" });
    }
  }
  const todo = [];
  for (const f of fresh) {
    if (known[f.fp] && alive?.has(known[f.fp])) seen.add(f.fp);
    else todo.push(f);
  }

  let done = 0;
  const failed = [];
  let offline = false;
  emit(rec.id, { state: "importing", done: 0, total: todo.length, failed: [] });

  for (const f of todo) {
    try {
      const file = toAudioFile(await f.handle.getFile());
      if (file) {
        const saved = await uploadSong(file);
        known[f.fp] = saved._id;
        saveKnown(userId, known);
        done++;
      }
      seen.add(f.fp);
    } catch (err) {
      if (err.response) {
        seen.add(f.fp); // the server refused this file: don't keep retrying it
        failed.push({ name: f.name, message: err.response.data?.message || "Upload failed" });
      } else {
        offline = true; // the server could not be reached: try again at the next check
        break;
      }
    }
    emit(rec.id, { state: "importing", done: done + failed.length, total: todo.length, failed });
  }

  await putFolder({ ...rec, seen: [...seen] });
  if (offline) emit(rec.id, { state: "offline", failed });
  else idle({ failed, lastImported: done });

  if (done) {
    window.dispatchEvent(new Event("library-changed")); // the Library page refreshes itself
    showToast(`${done} new song${done === 1 ? "" : "s"} imported from “${rec.name}”`);
  }
}

// ---- checking all folders (one check at a time, even with several tabs open) ----
let chain = Promise.resolve();
let queued = false;
const withLock = (fn) =>
  navigator.locks ? navigator.locks.request("music-folder-sync", { ifAvailable: true }, (lock) => (lock ? fn() : undefined)) : fn();

export function syncAll(userId) {
  if (queued) return chain;
  queued = true;
  chain = chain.then(async () => {
    queued = false;
    try {
      await withLock(async () => {
        for (const rec of await listFolders(userId)) {
          await syncFolder(rec, userId).catch((e) => emit(rec.id, { state: "error", message: String(e?.message || e) }));
        }
      });
    } catch {
      /* ignore */
    }
  });
  return chain;
}

// Start watching for this account. Returns a function that stops it.
export function startWatching(userId) {
  if (!watchSupported) return () => {};
  const check = () => syncAll(userId);
  check();
  const timer = setInterval(check, CHECK_MS);
  window.addEventListener("focus", check);
  return () => {
    clearInterval(timer);
    window.removeEventListener("focus", check);
  };
}

// Remember a folder that was just imported: `seenFps` are the songs already handled, so only songs added later count as new
export async function registerWatch(userId, handle, seenFps) {
  for (const f of await listFolders(userId)) {
    try {
      if (await f.handle.isSameEntry(handle)) {
        await putFolder({ ...f, seen: [...new Set([...f.seen, ...seenFps])] });
        version++;
        notify();
        syncAll(userId);
        return f;
      }
    } catch {
      /* compare failed: treat as a different folder */
    }
  }
  const rec = { id: newId(), userId, name: handle.name, handle, seen: [...new Set(seenFps)], createdAt: Date.now() };
  await putFolder(rec);
  version++;
  notify();
  syncAll(userId);
  return rec;
}

export async function removeFolder(id) {
  await deleteFolder(id);
  delete statuses[id];
  version++;
  notify();
}

// After a browser restart the browser may ask again; this must be called from a click
export async function requestAccess(rec, userId) {
  try {
    await rec.handle.requestPermission({ mode: "read" });
  } catch {
    /* the person said no */
  }
  return syncAll(userId);
}
