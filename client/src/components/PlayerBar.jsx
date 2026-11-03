import { usePlayer } from "../PlayerContext.jsx";
import { fmt } from "../utils.js";

export default function PlayerBar({ onToggleQueue, queueOpen }) {
  const p = usePlayer();
  const { current } = p;
  const openFull = () => current && p.setFullOpen(true);

  return (
    <footer className="bar">
      <div className="now">
        <div onClick={openFull} style={{ cursor: current ? "pointer" : "default" }} title={current ? "Open player" : ""}>
          {current?.coverUrl ? <img className="cover" src={current.coverUrl} alt="" /> : <div className="cover">🎵</div>}
        </div>
        <div className="meta" onClick={openFull} style={{ cursor: current ? "pointer" : "default" }}>
          <b>{current ? current.title : "Nothing playing"}</b>
          <span>{current ? current.artist : "Pick a song from your library"}</span>
        </div>
      </div>

      <div className="center">
        <div className="controls">
          <button className={p.shuffle ? "on" : ""} onClick={p.toggleShuffle} title="Shuffle">🔀</button>
          <button onClick={p.prev} title="Previous">⏮</button>
          <button className="big" onClick={p.togglePlay} title="Play / Pause">{p.playing ? "⏸" : "▶"}</button>
          <button onClick={() => p.next(false)} title="Next">⏭</button>
          <button className={p.repeat !== "off" ? "on" : ""} onClick={p.cycleRepeat} title={`Repeat: ${p.repeat}`}>
            🔁{p.repeat === "one" ? "1" : ""}
          </button>
        </div>
        <div className="seek">
          <span>{fmt(p.time)}</span>
          <input
            type="range" min="0" max={p.duration || 0} step="0.1"
            value={Math.min(p.time, p.duration || 0)}
            onChange={(e) => p.seek(Number(e.target.value))}
            disabled={!current}
          />
          <span>{fmt(p.duration)}</span>
        </div>
      </div>

      <div className="right">
        <button className="vol" onClick={p.toggleMute} title={p.muted || p.volume === 0 ? "Unmute" : "Mute"}>
          {p.muted || p.volume === 0 ? "🔇" : "🔊"}
        </button>
        <input type="range" min="0" max="1" step="0.01" value={p.muted ? 0 : p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} />
        <button className={queueOpen ? "on" : ""} onClick={onToggleQueue}>Queue ({p.queue.length})</button>
      </div>
    </footer>
  );
}
