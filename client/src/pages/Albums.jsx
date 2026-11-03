import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { albumMeta, fetchAllTracks, groupAlbums, sortAlbums } from "../albums.js";
import AlbumCover from "../components/AlbumCover.jsx";
import "./albums.css";

export default function Albums() {
  const [albums, setAlbums] = useState(null); // null while loading
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("name");
  const navigate = useNavigate();

  // Loads the songs and groups them by album (and again when songs are imported in the background)
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetchAllTracks()
        .then((tracks) => alive && setAlbums(groupAlbums(tracks)))
        .catch(() => alive && setError(true));
    load();
    window.addEventListener("library-changed", load);
    return () => {
      alive = false;
      window.removeEventListener("library-changed", load);
    };
  }, []);

  const shown = useMemo(() => {
    if (!albums) return [];
    const needle = q.trim().toLowerCase();
    const found = needle ? albums.filter((a) => `${a.name} ${a.artist} ${a.year}`.toLowerCase().includes(needle)) : albums;
    return sortAlbums(found, sort);
  }, [albums, q, sort]);

  return (
    <>
      <h1>Albums</h1>
      <div className="albums-head">
        <div className="searchbox">
          <input placeholder="Search albums…" value={q} onChange={(e) => setQ(e.target.value)} />
          {q && <button className="clear" title="Clear search" aria-label="Clear search" onClick={() => setQ("")}>✕</button>}
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort albums">
          <option value="name">A–Z</option>
          <option value="recent">Recently added</option>
          <option value="songs">Most songs</option>
        </select>
      </div>

      {error && <p className="err">Could not load your albums. Is the backend running on port 5000?</p>}
      {!error && albums === null && <p className="dim">Loading albums…</p>}
      {albums && !albums.length && <p className="dim">No albums yet. Import some songs first.</p>}
      {albums && albums.length > 0 && !shown.length && <p className="dim">No albums match your search.</p>}

      <div className="albumgrid">
        {shown.map((a) => (
          <button key={a.key} className="albumcard" onClick={() => navigate(`/albums/${encodeURIComponent(a.key)}`)}>
            <AlbumCover album={a} />
            <b title={a.name}>{a.name}</b>
            <span>{albumMeta(a)}</span>
          </button>
        ))}
      </div>
    </>
  );
}
