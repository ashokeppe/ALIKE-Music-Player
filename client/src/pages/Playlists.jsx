import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api.js";

export default function Playlists() {
  const [lists, setLists] = useState([]);
  const [name, setName] = useState("");

  const load = () => api.get("/playlists").then((r) => setLists(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const create = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post("/playlists", { name });
    setName("");
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this playlist?")) return;
    await api.delete(`/playlists/${id}`);
    load();
  };

  return (
    <>
      <h1>Playlists</h1>
      <form className="toolbar" onSubmit={create}>
        <input placeholder="New playlist name…" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Create</button>
      </form>
      {!lists.length && <p className="dim">No playlists yet.</p>}
      {lists.map((p) => (
        <div className="row" key={p._id}>
          <div className="cover">📁</div>
          <div className="meta">
            <Link to={`/playlists/${p._id}`}><b>{p.name}</b></Link>
            <span>{p.tracks.length} songs</span>
          </div>
          <button onClick={() => remove(p._id)}>Delete</button>
        </div>
      ))}
    </>
  );
}
