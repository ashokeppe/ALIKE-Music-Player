import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { albumMeta, fetchAllTracks, fmtTotal, groupAlbums } from "../albums.js";
import AlbumCover from "../components/AlbumCover.jsx";
import TrackRow from "../components/TrackRow.jsx";
import { usePlayer } from "../PlayerContext.jsx";
import "./albums.css";

export default function AlbumDetail() {
  const { key } = useParams();
  const [state, setState] = useState({ status: "loading" });
  const { playTracks, addToQueue, shuffle, toggleShuffle } = usePlayer();

  const load = useCallback(() => {
    fetchAllTracks()
      .then((tracks) => {
        const album = groupAlbums(tracks).find((a) => a.key === key);
        setState(album ? { status: "ok", album } : { status: "missing" });
      })
      .catch(() => setState({ status: "error" }));
  }, [key]);

  useEffect(() => {
    load();
    window.addEventListener("library-changed", load);
    return () => window.removeEventListener("library-changed", load);
  }, [load]);

  if (state.status === "loading") return <p className="dim">Loading…</p>;
  if (state.status === "error") return <p className="err">Could not load this album.</p>;
  if (state.status === "missing") return <p className="dim">This album is empty or no longer exists. <Link to="/albums">Back to albums</Link></p>;

  const { album } = state;
  const tracks = album.tracks;

  const shufflePlay = () => {
    if (!shuffle) toggleShuffle();
    playTracks(tracks, Math.floor(Math.random() * tracks.length));
  };

  return (
    <>
      <p><Link to="/albums">← Albums</Link></p>
      <div className="albumhero">
        <AlbumCover album={album} />
        <div>
          <h1>{album.name}</h1>
          <p className="dim">{albumMeta(album)} · {fmtTotal(album.duration)}</p>
        </div>
      </div>
      <div className="albumbtns">
        <button onClick={() => playTracks(tracks, 0)}>▶ Play</button>
        <button onClick={shufflePlay}>Shuffle</button>
        <button onClick={() => tracks.forEach(addToQueue)}>Add all to queue</button>
      </div>
      {tracks.map((t, i) => (
        <TrackRow key={t._id} track={t} tracks={tracks} i={i} onUpdated={load} onDeleted={load} />
      ))}
    </>
  );
}
