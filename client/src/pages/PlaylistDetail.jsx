import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api.js";
import { usePlayer } from "../PlayerContext.jsx";
import TrackRow from "../components/TrackRow.jsx";

export default function PlaylistDetail() {
  const { id } = useParams();
  const [pl, setPl] = useState(null);
  const [error, setError] = useState(false);
  const { playTracks } = usePlayer();

  useEffect(() => {
    api.get(`/playlists/${id}`).then((r) => setPl(r.data)).catch(() => setError(true));
  }, [id]);

  const remove = async (trackId) => {
    setPl((await api.delete(`/playlists/${id}/tracks/${trackId}`)).data);
  };

  if (error) return <p className="err">Playlist not found. <Link to="/playlists">Back</Link></p>;
  if (!pl) return <p className="dim">Loading…</p>;

  return (
    <>
      <p><Link to="/playlists">← Playlists</Link></p>
      <h1>{pl.name}</h1>
      <div className="toolbar">
        <button onClick={() => playTracks(pl.tracks, 0)} disabled={!pl.tracks.length}>▶ Play playlist</button>
      </div>
      {!pl.tracks.length && <p className="dim">Empty. Go to the Library and use “+ Playlist” on a song.</p>}
      {pl.tracks.map((t, i) => (
        <TrackRow
          key={t._id} track={t} tracks={pl.tracks} i={i}
          extra={<button onClick={() => remove(t._id)} title="Remove from playlist">✕</button>}
        />
      ))}
    </>
  );
}
