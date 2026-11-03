import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { getCallerTune } from "../callertune.js";
import Brand from "./Brand.jsx";
import Icon from "../icons.jsx";
import "./about.css";

const FEATURES = [
  ["Library & Albums", "Your songs in one place, grouped into albums automatically."],
  ["Liked songs & Playlists", "Tap the heart to like a song, or collect songs in your own playlists."],
  ["For You", "Recommendations based on the artists and genres of the songs you like."],
  ["Now Playing", "Full-screen player with a spinning record, synced lyrics, queue, shuffle and repeat."],
  ["Sound controls", "5-band equalizer, playback speed and a sleep timer."],
  ["Ringtone & Caller Tune", "Cut your favourite part of a song and download it, or save it as your caller tune."],
  ["Auto-import", "Import a folder once and new songs added to it are picked up automatically (Chrome / Edge)."],
  ["Themes & live wallpapers", "Dark, light and colour themes, your own picture, animated scenes and live weather."],
  ["Works on phones", "Bottom tab bar and a mini player on small screens."],
];

const TIPS = [
  "Tap a song's cover to open the full player; tap its title to play it.",
  "The ⋮ button on any song has Play next, Add to queue, Playlist, Ringtone, Caller tune, Info and Share.",
  "In the full player, the ⋮ button opens Sleep timer, Speed and Equalizer.",
  "Press Esc to close the full player, a menu or a window.",
  "Lyrics showing the wrong song? Use “wrong song? search again” under the lyrics.",
];

export default function AboutModal({ onClose }) {
  const { user } = useAuth();
  const [total, setTotal] = useState(null);
  const tune = getCallerTune(user.id);

  useEffect(() => {
    api.get("/tracks", { params: { limit: 1 } }).then((r) => setTotal(r.data.total)).catch(() => {});
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal about" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="About this app">
        <div className="abhead">
          <div className="ablogo"><Icon name="library" size={28} /></div>
          <div>
            <h2><Brand icon={false} /></h2>
            <p className="dim">Version 1.1 · your personal music library</p>
          </div>
        </div>

        <p className="abintro">
          Upload your own songs and play them anywhere: on a computer or on your phone's browser. Everything you add
          stays in your own library.
        </p>

        <div className="abstats">
          <div><b>{total ?? "…"}</b><span>songs in library</span></div>
          <div><b>{user.favorites?.length ?? 0}</b><span>liked songs</span></div>
          <div><b>{tune ? "On" : "—"}</b><span>caller tune</span></div>
        </div>

        <h3>What you can do</h3>
        <ul className="abfeat">
          {FEATURES.map(([t, d]) => (
            <li key={t}><b>{t}</b><span>{d}</span></li>
          ))}
        </ul>

        <h3>Tips</h3>
        <ul className="abtips">
          {TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>

        <h3>Good to know</h3>
        <ul className="abtips">
          <li>Songs are stored on your server. Your theme, queue and settings are saved in this browser only.</li>
          <li>Lyrics come from LRCLIB. The Live Weather theme uses Open-Meteo. Neither needs an account.</li>
          <li>A website cannot change your phone's ringtone or caller tune by itself. The app prepares the clip for you to use with your phone or operator.</li>
        </ul>

        <h3>Built with</h3>
        <p className="abtech">React · Vite · Node.js · Express · MongoDB · Python (FastAPI)</p>

        <div className="btns"><button onClick={onClose}>Close</button></div>
      </div>
    </div>,
    document.body
  );
}
