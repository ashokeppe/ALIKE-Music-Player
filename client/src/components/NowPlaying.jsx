import { useEffect, useState } from "react";
import { useAuth } from "../AuthContext.jsx";
import { usePlayer } from "../PlayerContext.jsx";
import { fmt } from "../utils.js";
import Ico from "../icons.jsx";
import { shareFile } from "../share.js";
import LyricsPanel from "./LyricsPanel.jsx";
import NowPlayingMenu from "./NowPlayingMenu.jsx";
import RingtoneModal from "./RingtoneModal.jsx";
import SongInfoModal from "./SongInfoModal.jsx";
import "./nowplaying.css";

// Simple SVG icons (same look on every computer)
const Icon = ({ d, size = 28 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true"><path d={d} /></svg>
);
const BACK = "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z";
const PLAY = "M8 5v14l11-7z";
const PAUSE = "M6 5h4v14H6zM14 5h4v14h-4z";

// A colorful pattern for songs without cover art (the same song always gets the same colors)
const hueOf = (s) => [...String(s || "")].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 360;
const artFor = (t) => {
  const h = hueOf(t.album || t.title);
  return {
    bg: `radial-gradient(circle at 78% 22%, hsl(${(h + 40) % 360} 85% 68% / .55) 0 14%, transparent 15%),
         repeating-radial-gradient(circle at 20% 85%, rgb(255 255 255 / .09) 0 2px, transparent 2px 22px),
         linear-gradient(145deg, hsl(${h} 70% 46%), hsl(${(h + 60) % 360} 70% 22%))`,
  };
};

export default function NowPlaying({ onOpenQueue }) {
  const p = usePlayer();
  const { favorites, toggleFavorite } = useAuth();
  const t = p.current;

  // Cover / Lyrics tab (remembered between visits)
  const [tab, setTab] = useState(() => {
    try { return localStorage.getItem("np-tab") === "lyrics" ? "lyrics" : "cover"; } catch { return "cover"; }
  });
  const pickTab = (v) => {
    setTab(v);
    try { localStorage.setItem("np-tab", v); } catch { /* ignore */ }
  };

  // The ⋮ options menu, and the Song info / Ringtone windows it opens
  const [menu, setMenu] = useState(false);
  const [modal, setModal] = useState(null);

  // Esc closes the screen
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && p.setFullOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [p]);

  if (!t) return null;
  const art = artFor(t);
  const liked = favorites.has(t._id);
  const close = () => p.setFullOpen(false);

  return (
    <div className="np" role="dialog" aria-label="Now playing">
      {t.coverUrl && <div className="np-bg" style={{ backgroundImage: `url(${t.coverUrl})` }} />}
      <div className="np-inner">
        <header className="np-top">
          <button className="np-ghost" onClick={close} title="Back (Esc)"><Icon d={BACK} /></button>
          <div className="np-tabs">
            <button className={tab === "cover" ? "on" : ""} onClick={() => pickTab("cover")}>COVER</button>
            <button className={tab === "lyrics" ? "on" : ""} onClick={() => pickTab("lyrics")}>LYRICS</button>
          </div>
          <button className="np-ghost" onClick={() => setMenu(true)} title="More options" aria-haspopup="menu"><Ico name="more" size={24} /></button>
        </header>

        {tab === "lyrics" ? (
          <LyricsPanel track={t} />
        ) : (
          <div className="np-art">
            <div className={`np-stage ${p.playing ? "playing" : ""}`}>
              {t.coverUrl && <img className="np-glow" src={t.coverUrl} alt="" aria-hidden="true" />}
              <div className="np-vinylwrap">
                <div className="np-vinyl">
                  <i style={t.coverUrl ? { backgroundImage: `url(${t.coverUrl})` } : { background: art.bg }} />
                </div>
              </div>
              <div className="np-cover">
                {t.coverUrl ? (
                  <img src={t.coverUrl} alt="" />
                ) : (
                  <div className="np-noart" style={{ background: art.bg }}><span>♪</span></div>
                )}
                <b className="np-sheen" />
              </div>
            </div>
          </div>
        )}

        <div className="np-info">
          <div className="np-text">
            <h2>{t.title}</h2>
            <p>{t.artist}{t.album ? ` · ${t.album}` : ""}</p>
          </div>
          <button
            className={`np-ghost fav ${liked ? "on" : ""}`}
            onClick={() => toggleFavorite(t._id).catch(() => {})}
            title={liked ? "Unlike" : "Like"}
          >
            {liked ? "♥" : "♡"}
          </button>
          <button className="np-ghost np-qinfo" onClick={() => { close(); onOpenQueue(); }} title="Queue" aria-label="Queue">
            <Ico name="queue" size={22} />
          </button>
        </div>

        <div className="np-seek">
          <span className="t1">{fmt(p.time)}</span>
          <input
            type="range" min="0" max={p.duration || 0} step="0.1"
            value={Math.min(p.time, p.duration || 0)}
            onChange={(e) => p.seek(Number(e.target.value))}
          />
          <span className="t2">{fmt(p.duration)}</span>
        </div>

        <div className="np-controls">
          <button className={`np-ghost ${p.shuffle ? "on" : ""}`} onClick={p.toggleShuffle} title="Shuffle">🔀</button>
          <button className="np-ghost" onClick={p.prev} title="Previous">⏮</button>
          <button className="big" onClick={p.togglePlay} title="Play / Pause"><Icon d={p.playing ? PAUSE : PLAY} size={64} /></button>
          <button className="np-ghost" onClick={() => p.next(false)} title="Next">⏭</button>
          <button className={`np-ghost ${p.repeat !== "off" ? "on" : ""}`} onClick={p.cycleRepeat} title={`Repeat: ${p.repeat}`}>
            🔁{p.repeat === "one" ? "1" : ""}
          </button>
        </div>

        <div className="np-side">
          <div className="np-vol">
            <button className="np-ghost" onClick={p.toggleMute} title={p.muted || p.volume === 0 ? "Unmute" : "Mute"}>
              {p.muted || p.volume === 0 ? "🔇" : "🔊"}
            </button>
            <input type="range" min="0" max="1" step="0.01" value={p.muted ? 0 : p.volume} onChange={(e) => p.setVolume(Number(e.target.value))} />
          </div>
          <button className="np-ghost" onClick={() => { close(); onOpenQueue(); }} title="Queue"><Ico name="queue" size={22} /></button>
        </div>
      </div>

      {menu && (
        <NowPlayingMenu
          onClose={() => setMenu(false)}
          onInfo={() => setModal("info")}
          onRingtone={() => setModal("ringtone")}
          onCallerTune={() => setModal("callertune")}
          onShare={() => shareFile(t)}
        />
      )}
      {modal === "info" && <SongInfoModal track={t} onClose={() => setModal(null)} />}
      {modal === "ringtone" && <RingtoneModal track={t} onClose={() => setModal(null)} />}
      {modal === "callertune" && <RingtoneModal kind="callertune" track={t} onClose={() => setModal(null)} />}
    </div>
  );
}
