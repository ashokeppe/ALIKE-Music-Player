import { useState } from "react";
import api from "../api.js";

export default function EditTrackModal({ track, onClose, onSaved }) {
  const [f, setF] = useState({
    title: track.title,
    artist: track.artist,
    album: track.album || "",
    genre: track.genre || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF((v) => ({ ...v, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await api.put(`/tracks/${track._id}`, f);
      onSaved(data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Could not save changes");
      setBusy(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
        <h2>Edit song</h2>
        <label>Title<input value={f.title} onChange={set("title")} /></label>
        <label>Artist<input value={f.artist} onChange={set("artist")} /></label>
        <label>Album<input value={f.album} onChange={set("album")} /></label>
        <label>Genre<input value={f.genre} onChange={set("genre")} /></label>
        {error && <span className="err">{error}</span>}
        <div className="btns">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </div>
  );
}
