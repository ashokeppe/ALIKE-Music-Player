import { useEffect, useState } from "react";
import api from "../api.js";
import { usePlayer } from "../PlayerContext.jsx";
import TrackRow from "../components/TrackRow.jsx";

export default function Recommended() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);
  const { playTracks } = usePlayer();

  useEffect(() => {
    api.get("/recommendations").then((r) => setData(r.data)).catch(() => setError(true));
  }, []);

  if (error) return <p className="err">Could not load recommendations.</p>;
  if (!data) return <p className="dim">Loading…</p>;

  const note =
    data.engine === "basic"
      ? "The Python service is offline, so this is a basic ranking (same artist or genre as your liked songs)."
      : data.reason === "popular"
      ? "Like a few songs (♡) and this list will match your taste. For now, here are the most played songs."
      : "Ranked by the Python service, based on the artists and genres of your liked songs.";

  return (
    <>
      <h1>For You</h1>
      <p className="note">{note}</p>
      <div className="toolbar">
        <button onClick={() => playTracks(data.tracks, 0)} disabled={!data.tracks.length}>▶ Play all</button>
      </div>
      {!data.tracks.length && <p className="dim">No other songs to recommend yet. Upload more songs first.</p>}
      {data.tracks.map((t, i) => (
        <TrackRow key={t._id} track={t} tracks={data.tracks} i={i} />
      ))}
    </>
  );
}
