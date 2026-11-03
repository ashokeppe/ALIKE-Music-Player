import { usePlayer } from "../PlayerContext.jsx";

// The small player above the tab bar on phones. Tap it to open the full song screen.
export default function MiniPlayer() {
  const { current, playing, togglePlay, next, time, duration, setFullOpen } = usePlayer();
  if (!current) return null;
  const pct = duration ? Math.min(100, (time / duration) * 100) : 0;

  return (
    <div className="mini" onClick={() => setFullOpen(true)} role="button" aria-label="Open player">
      <div className="mini-bar"><i style={{ width: `${pct}%` }} /></div>
      {current.coverUrl ? <img className="cover" src={current.coverUrl} alt="" /> : <div className="cover">🎵</div>}
      <div className="meta">
        <b>{current.title}</b>
        <span>{current.artist}</span>
      </div>
      <button aria-label={playing ? "Pause" : "Play"} onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
        <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
          {playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M8 5v14l11-7z" />}
        </svg>
      </button>
      <button aria-label="Next song" onClick={(e) => { e.stopPropagation(); next(false); }}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M6 5l9 7-9 7zM17 5h2v14h-2z" /></svg>
      </button>
    </div>
  );
}
