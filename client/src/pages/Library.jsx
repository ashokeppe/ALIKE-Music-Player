import { useEffect, useRef, useState } from "react";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { usePlayer } from "../PlayerContext.jsx";
import TrackRow from "../components/TrackRow.jsx";
import "./library.css";

export default function Library() {
  const [q, setQ] = useState(() => new URLSearchParams(window.location.search).get("q") || ""); // shared links open pre-searched
  const [tracks, setTracks] = useState([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("loading");
  const [reload, setReload] = useState(0);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [deleting, setDeleting] = useState(null); // { done, total } while a bulk delete runs
  const [message, setMessage] = useState("");

  const searchRef = useRef(null);
  const { user } = useAuth();
  const { playTracks, current, clearQueue } = usePlayer();

  // Debounced search: waits 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      api
        .get("/tracks", { params: { q, limit: 100 } })
        .then((r) => {
          setTracks(r.data.tracks);
          setTotal(r.data.total);
          setStatus("ok");
        })
        .catch(() => setStatus("error"));
    }, 300);
    return () => clearTimeout(t);
  }, [q, reload]);

  // Songs imported in the background (watched folders) show up without refreshing the page
  useEffect(() => {
    const bump = () => setReload((n) => n + 1);
    window.addEventListener("library-changed", bump);
    return () => window.removeEventListener("library-changed", bump);
  }, []);

  const onUpdated = (t) => setTracks((ts) => ts.map((x) => (x._id === t._id ? t : x)));
  const onDeleted = (id) => setTracks((ts) => ts.filter((x) => x._id !== id));

  // Only songs you uploaded (or old songs with no owner) can be deleted
  const deletable = tracks.filter((t) => !t.owner || t.owner === user.id);
  const chosen = deletable.filter((t) => selected.has(t._id)).map((t) => t._id);
  const allSelected = deletable.length > 0 && chosen.length === deletable.length;

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelected(allSelected ? new Set() : new Set(deletable.map((t) => t._id)));

  const startSelecting = () => {
    setMessage("");
    setSelectMode(true);
  };

  const stopSelecting = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const deleteSelected = async () => {
    const ids = [...chosen];
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} song${ids.length === 1 ? "" : "s"}? This cannot be undone.`)) return;

    const deleted = new Set();
    const failed = [];
    let next = 0;
    let done = 0;
    setMessage("");
    setDeleting({ done: 0, total: ids.length });

    // 4 deletions at a time
    const worker = async () => {
      while (next < ids.length) {
        const id = ids[next++];
        try {
          await api.delete(`/tracks/${id}`);
          deleted.add(id);
        } catch {
          failed.push(id);
        }
        setDeleting({ done: ++done, total: ids.length });
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, ids.length) }, worker));

    setTracks((ts) => ts.filter((t) => !deleted.has(t._id)));
    setTotal((n) => n - deleted.size);
    if (current && deleted.has(current._id)) clearQueue(); // the playing song no longer exists
    setDeleting(null);
    setReload((n) => n + 1); // refresh from the server (also loads songs that were beyond the first 100)

    if (failed.length) {
      setSelected(new Set(failed));
      setMessage(`${deleted.size} deleted. ${failed.length} could not be deleted.`);
    } else {
      stopSelecting();
      setMessage(`${deleted.size} song${deleted.size === 1 ? "" : "s"} deleted.`);
    }
  };

  return (
    <>
      <h1>Library</h1>
      <div className="toolbar">
        <div className="searchbox">
          <input
            ref={searchRef} placeholder="Search title, artist or album…" value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQ("")}
          />
          {q && (
            <button className="clear" title="Clear search" aria-label="Clear search" onClick={() => { setQ(""); searchRef.current?.focus(); }}>
              ✕
            </button>
          )}
        </div>
        <button onClick={() => playTracks(tracks, 0)} disabled={!tracks.length || selectMode}>▶ Play all</button>
        <button onClick={selectMode ? stopSelecting : startSelecting} disabled={(!tracks.length && !selectMode) || !!deleting}>
          {selectMode ? "Cancel" : "Select"}
        </button>
      </div>

      {selectMode && (
        <div className="selbar">
          <label className="selall">
            <input
              type="checkbox" className="rowcheck" checked={allSelected} onChange={selectAll}
              disabled={!deletable.length || !!deleting}
            />
            Select all ({deletable.length})
          </label>
          <span className="grow dim">
            {deleting ? `Deleting ${deleting.done} of ${deleting.total}…` : `${chosen.length} selected`}
            {!deleting && deletable.length < tracks.length && " · songs uploaded by others can't be selected"}
          </span>
          <button className="danger" onClick={deleteSelected} disabled={!chosen.length || !!deleting}>
            🗑 Delete selected ({chosen.length})
          </button>
        </div>
      )}

      {message && <p className="libmsg">{message}</p>}
      {status === "error" && <p className="err">Could not reach the server. Is the backend running on port 5000?</p>}
      {status === "ok" && !tracks.length && <p className="dim">{q ? "No matches." : "No tracks yet. Use the Upload page to add one."}</p>}
      {total > tracks.length && <p className="dim">Showing {tracks.length} of {total} songs.</p>}

      {tracks.map((t, i) => (
        <TrackRow
          key={t._id} track={t} tracks={tracks} i={i}
          onUpdated={onUpdated} onDeleted={onDeleted}
          selectMode={selectMode} selected={selected.has(t._id)} onSelect={toggle}
        />
      ))}
    </>
  );
}
