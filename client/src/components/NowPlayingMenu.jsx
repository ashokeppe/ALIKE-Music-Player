import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api.js";
import { BAND_LABELS, PRESETS } from "../equalizer.js";
import Icon from "../icons.jsx";
import { useAuth } from "../AuthContext.jsx";
import { getCallerTune } from "../callertune.js";
import { usePlayer } from "../PlayerContext.jsx";
import { showToast } from "../toast.js";

const SLEEP_MINUTES = [5, 10, 15, 30, 45, 60];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const TITLES = { sleep: "Sleep Timer", speed: "Speed", eq: "Equalizer", playlists: "Add to Playlist" };

const mmss = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// The ⋮ menu of the song details screen: a panel on computers, a bottom sheet on phones
export default function NowPlayingMenu({ onClose, onInfo, onRingtone, onCallerTune, onShare }) {
  const p = usePlayer();
  const { user } = useAuth();
  const track = p.current;
  const [view, setView] = useState("main"); // main | sleep | speed | eq | playlists
  const [lists, setLists] = useState(null);
  const [, tick] = useState(0);

  // keeps the "Stops in 12:34" countdown moving
  useEffect(() => {
    if (p.sleep?.kind !== "minutes") return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [p.sleep]);

  // Esc goes back one step (or closes the menu) instead of closing the whole screen
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      e.stopImmediatePropagation();
      if (view === "main") onClose();
      else setView("main");
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [view, onClose]);

  if (!track) return null;

  const openPlaylists = async () => {
    setView("playlists");
    try {
      setLists((await api.get("/playlists")).data);
    } catch {
      setLists([]);
    }
  };

  const addTo = async (pl) => {
    onClose();
    try {
      await api.post(`/playlists/${pl._id}/tracks`, { trackId: track._id });
      showToast(`Added to “${pl.name}”`);
    } catch {
      showToast("Could not add to the playlist");
    }
  };

  const run = (fn) => () => {
    onClose();
    fn();
  };

  const sleepText = !p.sleep ? "Off" : p.sleep.kind === "song" ? "End of song" : mmss(p.sleep.until - Date.now());
  const speedText = p.speed === 1 ? "Normal" : `${p.speed}×`;
  const eqText = p.eq.preset === "flat" ? "Off" : PRESETS.find((x) => x.id === p.eq.preset)?.name || "Custom";

  const choice = (label, active, onPick) => (
    <button key={label} className="npm-item" onClick={onPick}>
      {label}
      {active && <Icon name="check" size={18} className="tick" />}
    </button>
  );

  return createPortal(
    <div className="npm-backdrop" onMouseDown={onClose}>
      <div className="npm" onMouseDown={(e) => e.stopPropagation()} role="menu">
        <div className="npm-head">
          {view === "main" ? (
            <button className="npm-cancel" onClick={onClose}>Cancel</button>
          ) : (
            <button className="npm-back" onClick={() => setView("main")}><Icon name="back" size={18} />{TITLES[view]}</button>
          )}
        </div>

        {view === "main" && (
          <>
            <button className="npm-item" onClick={() => setView("sleep")}><Icon name="clock" size={24} />Sleep Timer<span className="npm-val">{sleepText}</span></button>
            <button className="npm-item" onClick={() => setView("speed")}><Icon name="speed" size={24} />Speed<span className="npm-val">{speedText}</span></button>
            <button className="npm-item" onClick={() => setView("eq")}><Icon name="equalizer" size={24} />Equalizer<span className="npm-val">{eqText}</span></button>
            <button className="npm-item" onClick={openPlaylists}><Icon name="playlistAdd" size={24} />Add to Playlist</button>
            <button className="npm-item" onClick={run(onInfo)}><Icon name="info" size={24} />Song Info</button>
            <button className="npm-item" onClick={run(onRingtone)}><Icon name="bell" size={24} />Set as Ringtone</button>
            <button className="npm-item" onClick={run(onCallerTune)}><Icon name="phone" size={24} />Set as Caller Tune{getCallerTune(user.id)?.trackId === track._id && <span className="npm-val">Active</span>}</button>
            <button className="npm-item" onClick={run(onShare)}><Icon name="share" size={24} />Share file</button>
          </>
        )}

        {view === "sleep" && (
          <>
            {p.sleep?.kind === "minutes" && <p className="npm-note">Playback stops in {mmss(p.sleep.until - Date.now())}.</p>}
            {choice("Off", !p.sleep, () => { p.setSleep(null); setView("main"); })}
            {SLEEP_MINUTES.map((m) =>
              choice(`${m} minutes`, p.sleep?.kind === "minutes" && p.sleep.minutes === m, () => {
                p.setSleep(m);
                showToast(`Sleep timer: stopping in ${m} minutes`);
                setView("main");
              })
            )}
            {choice("End of this song", p.sleep?.kind === "song", () => {
              p.setSleep("song");
              showToast("Sleep timer: stopping after this song");
              setView("main");
            })}
          </>
        )}

        {view === "speed" && (
          <>
            <p className="npm-note">Changes how fast the song plays. The voice keeps its normal pitch.</p>
            {SPEEDS.map((s) => choice(s === 1 ? "Normal (1×)" : `${s}×`, p.speed === s, () => p.setSpeed(s)))}
          </>
        )}

        {view === "eq" && (
          <>
            <div className="npm-chips">
              {PRESETS.map((pr) => (
                <button key={pr.id} className={p.eq.preset === pr.id ? "on" : ""} onClick={() => p.setEq({ preset: pr.id, gains: pr.gains })}>{pr.name}</button>
              ))}
            </div>
            {BAND_LABELS.map((label, i) => (
              <label className="npm-band" key={label}>
                <span>{label}</span>
                <input
                  type="range" min="-12" max="12" step="1" value={p.eq.gains[i]}
                  onChange={(e) => {
                    const gains = [...p.eq.gains];
                    gains[i] = Number(e.target.value);
                    p.setEq({ preset: "custom", gains });
                  }}
                />
                <b>{p.eq.gains[i] > 0 ? "+" : ""}{p.eq.gains[i]} dB</b>
              </label>
            ))}
          </>
        )}

        {view === "playlists" && (
          <>
            {lists === null && <p className="npm-note">Loading…</p>}
            {lists && !lists.length && <p className="npm-note">No playlists yet. Create one in the Playlists tab.</p>}
            {(lists || []).map((pl) => (
              <button key={pl._id} className="npm-item" onClick={() => addTo(pl)}>{pl.name}</button>
            ))}
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
