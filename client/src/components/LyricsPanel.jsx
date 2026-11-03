import { useEffect, useRef, useState } from "react";
import api from "../api.js";
import { usePlayer } from "../PlayerContext.jsx";
import { activeLine, parseLrc } from "../lyrics.js";

const HOLD_MS = 6000; // after you scroll by hand, automatic scrolling waits a few seconds

export default function LyricsPanel({ track }) {
  const { time, duration, seek } = usePlayer();
  const [state, setState] = useState({ status: "loading" }); // loading | synced | plain | none | error
  const boxRef = useRef(null);
  const lineRefs = useRef([]);
  const reqRef = useRef(0);
  const manualUntil = useRef(0);

  // Fetches the lyrics (the server finds them automatically and remembers them)
  const load = (refresh) => {
    const id = ++reqRef.current;
    setState({ status: "loading" });
    api
      .get(`/lyrics/${track._id}`, { params: refresh ? { refresh: 1 } : {} })
      .then(({ data }) => {
        if (id !== reqRef.current) return;
        const lines = data.synced ? parseLrc(data.synced) : [];
        if (lines.length) setState({ status: "synced", lines });
        else if (data.plain) setState({ status: "plain", text: data.plain });
        else setState({ status: "none" });
      })
      .catch(() => {
        if (id === reqRef.current) setState({ status: "error" });
      });
  };

  useEffect(() => {
    load(false);
    boxRef.current?.scrollTo({ top: 0 });
    return () => { reqRef.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track._id]);

  const holdAuto = () => { manualUntil.current = Date.now() + HOLD_MS; };

  // Synced lyrics: keep the line being sung in the middle
  const lines = state.status === "synced" ? state.lines : null;
  const active = lines ? activeLine(lines, time) : -1;

  useEffect(() => {
    const box = boxRef.current;
    const el = lineRefs.current[active];
    if (!box || !el || Date.now() < manualUntil.current) return;
    box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
  }, [active]);

  // Plain lyrics have no timing, so scroll by the song's progress (an estimate)
  useEffect(() => {
    const box = boxRef.current;
    if (state.status !== "plain" || !box || !duration || Date.now() < manualUntil.current) return;
    const p = Math.min(1, Math.max(0, (time / duration - 0.06) / 0.86)); // allow for the intro and the ending
    box.scrollTop = p * (box.scrollHeight - box.clientHeight);
  }, [time, duration, state.status]);

  return (
    <div className="np-lyrics" ref={boxRef} onWheel={holdAuto} onTouchStart={holdAuto}>
      {state.status === "loading" && <p className="np-ly-msg">Searching for lyrics…</p>}
      {state.status === "error" && (
        <p className="np-ly-msg">Could not load lyrics.<br /><button onClick={() => load(false)}>Retry</button></p>
      )}
      {state.status === "none" && (
        <p className="np-ly-msg">No matching lyrics found for this song.<br /><button onClick={() => load(true)}>Search again</button></p>
      )}
      {state.status === "plain" && <div className="np-ly-plain">{state.text}</div>}
      {lines &&
        lines.map((l, i) => (
          <p
            key={i}
            ref={(el) => { lineRefs.current[i] = el; }}
            className={`np-line ${i === active ? "on" : ""}`}
            onClick={() => seek(l.time)}
          >
            {l.text || "♪"}
          </p>
        ))}

      {state.status === "synced" && (
        <div className="np-ly-src">
          <span>Synced lyrics from LRCLIB</span>
          <button className="np-link" onClick={() => load(true)}>wrong song? search again</button>
        </div>
      )}
      {state.status === "plain" && (
        <div className="np-ly-src">
          <span>Lyrics from LRCLIB · no timing available, so they scroll by estimate</span>
          <button className="np-link" onClick={() => load(true)}>wrong song? search again</button>
        </div>
      )}
    </div>
  );
}
