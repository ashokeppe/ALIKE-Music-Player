import { usePlayer } from "../PlayerContext.jsx";
import { fmt } from "../utils.js";

export default function QueuePanel({ onClose }) {
  const { queue, index, jumpTo, removeFromQueue, clearQueue } = usePlayer();

  return (
    <aside className="queue">
      <div className="qhead">
        <b>Queue</b>
        <span>
          <button onClick={clearQueue} disabled={!queue.length}>Clear</button>{" "}
          <button onClick={onClose}>✕</button>
        </span>
      </div>
      {!queue.length && <p className="dim">The queue is empty. Use “+ Queue” on any song.</p>}
      {queue.map((t, i) => (
        <div key={`${t._id}-${i}`} className={`qitem ${i === index ? "active" : ""}`}>
          <div className="meta" onClick={() => jumpTo(i)} style={{ cursor: "pointer" }}>
            <b>{i === index ? "▶ " : ""}{t.title}</b>
            <span>{t.artist} · {fmt(t.duration)}</span>
          </div>
          <button onClick={() => removeFromQueue(i)} title="Remove">✕</button>
        </div>
      ))}
    </aside>
  );
}
