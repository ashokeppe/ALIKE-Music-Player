import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { readTags } from "../readTags.js";
import WatchedFolders from "../components/WatchedFolders.jsx";
import { pickFolder, registerWatch, watchSupported } from "../folderWatch.js";
import "./upload.css";

// File types the player can handle (by extension)
const MIME = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  wav: "audio/wav",
  flac: "audio/flac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  weba: "audio/webm",
};

// Returns an audio File (with a correct type) or null if it is not a song
const toAudioFile = (f) => {
  const ext = f.name.split(".").pop().toLowerCase();
  const mime = MIME[ext];
  if (mime) return f.type === mime ? f : new File([f], f.name, { type: mime, lastModified: f.lastModified });
  return f.type.startsWith("audio/") ? f : null;
};

const fingerprint = (f) => `${f.name}|${f.size}|${f.lastModified}`;
const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

// Remembers which file became which library song: { "name|size|modified": songId }
const loadKnown = (key) => {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? v : {};
  } catch {
    return {};
  }
};
const saveKnown = (key, map) => {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* storage full or blocked: ignore */
  }
};

// IDs of every song that is in the library right now
const fetchLibraryIds = async () => {
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
};

// Reads the song length in the browser (used if the Python service is offline)
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

export default function Upload() {
  const { user } = useAuth();
  const storeKey = `imported-map:${user.id}`;

  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const [again, setAgain] = useState(false);
  const [notice, setNotice] = useState("");
  const [pendingWatch, setPendingWatch] = useState(null); // a folder just chosen: { handle, name, fps }
  const [watchNew, setWatchNew] = useState(true);

  const fileRef = useRef(null);
  const folderRef = useRef(null);
  const cancelRef = useRef(false);
  const idRef = useRef(0);

  // Stop the import if the user leaves this page
  useEffect(() => () => { cancelRef.current = true; }, []);

  // Warn before closing the tab mid-import
  useEffect(() => {
    if (!running) return;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [running]);

  const patch = (id, changes) =>
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...changes } : i)));

  // Accepts files from either picker. For a folder, every file inside it (including
  // sub-folders) arrives here; non-audio files are dropped and folder names are never kept.
  const addFiles = (fileList) => {
    const files = Array.from(fileList);
    const seen = new Set(items.map((i) => i.fp));
    const added = [];
    let ignored = 0;
    let duplicates = 0;

    for (const f of files) {
      const file = toAudioFile(f);
      if (!file) {
        ignored++;
        continue;
      }
      const fp = fingerprint(f);
      if (seen.has(fp)) {
        duplicates++;
        continue;
      }
      seen.add(fp);
      added.push({ id: ++idRef.current, file, fp, name: f.name, size: f.size, status: "ready", progress: 0, message: "" });
    }

    added.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" }));
    setItems((prev) => [...prev, ...added]);
    setNotice(
      [
        added.length ? `${added.length} song${added.length === 1 ? "" : "s"} added to the list.` : "No songs found.",
        ignored ? `${ignored} non-audio file${ignored === 1 ? "" : "s"} ignored.` : "",
        duplicates ? `${duplicates} duplicate${duplicates === 1 ? "" : "s"} skipped.` : "",
      ]
        .filter(Boolean)
        .join(" ")
    );
  };

  const onPick = (e) => {
    addFiles(e.target.files); // copies the list first...
    e.target.value = ""; // ...then resets so the same folder can be picked again
  };

  // Chrome / Edge: choose a folder in a way that lets the app keep watching it for new songs
  const chooseFolder = async () => {
    if (!watchSupported) return folderRef.current.click();
    try {
      const { handle, files } = await pickFolder();
      setPendingWatch({ handle, name: handle.name, fps: files.map(fingerprint) });
      addFiles(files);
    } catch (err) {
      if (err.name !== "AbortError") setNotice("Could not open that folder.");
    }
  };

  const start = async () => {
    const todo = items.filter((i) => i.status === "ready");
    if (!todo.length) return;

    try {
      localStorage.removeItem(`imported-files:${user.id}`); // old list from the previous version
    } catch {
      /* ignore */
    }
    const known = loadKnown(storeKey);
    cancelRef.current = false;
    setRunning(true);
    setNotice("");

    // A song counts as "already in library" only if it still exists there.
    // Songs you deleted are forgotten, so they can be imported again.
    if (Object.keys(known).length) {
      try {
        const alive = await fetchLibraryIds();
        for (const fp of Object.keys(known)) if (!alive.has(known[fp])) delete known[fp];
        saveKnown(storeKey, known);
      } catch {
        setNotice("Could not check your library. Is the server running?");
        setRunning(false);
        return;
      }
    }

    for (const it of todo) {
      if (cancelRef.current) break;

      if (!again && known[it.fp]) {
        patch(it.id, { status: "skipped", message: "Already in library" });
        continue;
      }

      patch(it.id, { status: "uploading", progress: 0 });
      try {
        // Read the song's tags (title, artist, album, genre, cover art) in the browser
        const [duration, tags] = await Promise.all([probeDuration(it.file), readTags(it.file)]);
        const form = new FormData();
        form.append("duration", duration);
        for (const k of ["title", "artist", "album", "genre"]) if (tags[k]) form.append(k, tags[k]);
        if (tags.cover) form.append("cover", tags.cover);
        form.append("audio", it.file);
        const { data: saved } = await api.post("/tracks", form, {
          onUploadProgress: (p) => patch(it.id, { progress: Math.round((p.loaded * 100) / (p.total || p.loaded)) }),
        });
        patch(it.id, { status: "done", progress: 100 });
        known[it.fp] = saved._id;
        saveKnown(storeKey, known);
      } catch (err) {
        patch(it.id, {
          status: "error",
          message: err.response ? err.response.data?.message || "Upload failed" : "Could not reach the server",
        });
      }
    }
    setRunning(false);

    // The whole folder has been handled: from now on, new songs added to it are imported automatically
    if (pendingWatch && watchNew && !cancelRef.current) {
      try {
        await registerWatch(user.id, pendingWatch.handle, pendingWatch.fps);
        setNotice(`Watching “${pendingWatch.name}”: new songs you add to it are imported automatically.`);
      } catch {
        setNotice("The songs were imported, but the folder could not be watched.");
      }
      setPendingWatch(null);
    }
  };

  const count = (s) => items.filter((i) => i.status === s).length;
  const ready = count("ready");
  const done = count("done");
  const failed = count("error");
  const skipped = count("skipped");
  const finished = done + failed + skipped;

  return (
    <div className="imp">
      <h1>Import songs</h1>
      <p className="hint">
        Choose songs from your computer, or choose a whole folder. Only audio files are imported, other files are
        ignored, and folder names are not saved, so your library shows just the songs. Title, artist, album and cover
        art are read from each file's tags.
      </p>

      <div className="pick">
        <button onClick={() => fileRef.current.click()} disabled={running}>🎵 Choose songs…</button>
        <button onClick={chooseFolder} disabled={running}>📁 Choose folder…</button>
      </div>
      <input ref={fileRef} type="file" multiple hidden onChange={onPick} accept="audio/*,.mp3,.m4a,.aac,.wav,.flac,.ogg,.opus" />
      <input ref={folderRef} type="file" multiple hidden onChange={onPick} webkitdirectory="" />
      {pendingWatch && !running && (
        <label className="check">
          <input type="checkbox" checked={watchNew} onChange={(e) => setWatchNew(e.target.checked)} />
          After importing, keep watching “{pendingWatch.name}” and import new songs added to it automatically
        </label>
      )}

      {notice && <p className="notice">{notice}</p>}

      {items.length > 0 && (
        <>
          <div className="list">
            {items.map((it) => (
              <div className="item" key={it.id}>
                <span className="name" title={it.name}>{it.name}</span>
                <span className="dim">{fmtSize(it.size)}</span>
                <span className={`st ${it.status}`}>
                  {it.status === "ready" &&
                    (running ? "Waiting" : (
                      <button className="x" title="Remove from list" onClick={() => setItems((p) => p.filter((i) => i.id !== it.id))}>✕</button>
                    ))}
                  {it.status === "uploading" && `Uploading ${it.progress}%`}
                  {it.status === "done" && "✓ Added"}
                  {(it.status === "skipped" || it.status === "error") && it.message}
                </span>
              </div>
            ))}
          </div>

          {running && (
            <>
              <progress value={finished} max={items.length} />
              <p className="dim">Importing {Math.min(finished + 1, items.length)} of {items.length}. Keep this page open until it finishes.</p>
            </>
          )}

          <div className="actions2">
            {!running && (
              <button onClick={start} disabled={!ready}>
                Import {ready} song{ready === 1 ? "" : "s"}
              </button>
            )}
            {running && <button onClick={() => { cancelRef.current = true; }}>Stop after this song</button>}
            {!running && <button onClick={() => { setItems([]); setNotice(""); setPendingWatch(null); }}>Clear list</button>}
          </div>

          <label className="check">
            <input type="checkbox" checked={again} onChange={(e) => setAgain(e.target.checked)} disabled={running} />
            Import again even if the song is already in my library
          </label>

          {!running && finished > 0 && (
            <p className={failed ? "err" : "ok"}>
              Added {done} · Skipped {skipped} · Failed {failed}. <Link to="/">View library</Link>
            </p>
          )}
        </>
      )}

      <WatchedFolders />
    </div>
  );
}
