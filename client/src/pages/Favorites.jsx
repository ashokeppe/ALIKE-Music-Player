import { useEffect, useState } from "react";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { usePlayer } from "../PlayerContext.jsx";
import TrackRow from "../components/TrackRow.jsx";

export default function Favorites() {
  const [tracks, setTracks] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const { favorites } = useAuth();
  const { playTracks } = usePlayer();

  useEffect(() => {
    api.get("/favorites").then((r) => setTracks(r.data)).catch(() => {}).finally(() => setLoaded(true));
  }, []);

  // Unliking a song hides it immediately
  const shown = tracks.filter((t) => favorites.has(t._id));

  const onUpdated = (t) => setTracks((ts) => ts.map((x) => (x._id === t._id ? t : x)));
  const onDeleted = (id) => setTracks((ts) => ts.filter((x) => x._id !== id));

  return (
    <>
      <h1>Liked Songs</h1>
      <div className="toolbar">
        <button onClick={() => playTracks(shown, 0)} disabled={!shown.length}>▶ Play all</button>
      </div>
      {loaded && !shown.length && <p className="dim">Nothing here yet. Tap the ♡ on a song to like it.</p>}
      {shown.map((t, i) => (
        <TrackRow key={t._id} track={t} tracks={shown} i={i} onUpdated={onUpdated} onDeleted={onDeleted} />
      ))}
    </>
  );
}
