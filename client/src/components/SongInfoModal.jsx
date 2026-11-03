import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../AuthContext.jsx";
import { fmt } from "../utils.js";
import "./rowmenu.css";

const FORMATS = {
  "audio/mpeg": "MP3", "audio/mp3": "MP3", "audio/mp4": "M4A (AAC)", "audio/x-m4a": "M4A (AAC)", "audio/aac": "AAC",
  "audio/flac": "FLAC", "audio/x-flac": "FLAC", "audio/wav": "WAV", "audio/x-wav": "WAV", "audio/ogg": "OGG", "audio/webm": "WebM",
};

export default function SongInfoModal({ track, onClose }) {
  const { user } = useAuth();
  const [size, setSize] = useState(0);

  // The file size comes from the server (a header-only request: it does not count as a play)
  useEffect(() => {
    fetch(track.streamUrl, { method: "HEAD" })
      .then((r) => setSize(Number(r.headers.get("content-length")) || 0))
      .catch(() => {});
  }, [track.streamUrl]);

  const kbps = size && track.duration ? Math.round((size * 8) / track.duration / 1000) : 0;
  const rows = [
    ["Title", track.title],
    ["Artist", track.artist],
    ["Album", track.album || "—"],
    ["Genre", track.genre || "—"],
    ["Duration", track.duration ? fmt(track.duration) : "—"],
    ["Format", FORMATS[track.mimeType] || track.mimeType || "—"],
    ["File size", size ? `${(size / 1048576).toFixed(1)} MB` : "—"],
    ["Bitrate", kbps ? `about ${kbps} kbps` : "—"],
    ["Plays", String(track.plays ?? 0)],
    ["Added", track.createdAt ? new Date(track.createdAt).toLocaleString() : "—"],
    ["Uploaded by", track.owner ? (track.owner === user.id ? "You" : "Another user") : "—"],
  ];

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Song info</h2>
        <div className="infohead">
          {track.coverUrl ? <img className="cover" src={track.coverUrl} alt="" /> : <div className="cover">🎵</div>}
          <div className="meta"><b>{track.title}</b><span>{track.artist}</span></div>
        </div>
        <dl className="info">
          {rows.map(([k, v]) => (
            <div key={k} className="inforow"><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <div className="btns"><button onClick={onClose}>Close</button></div>
      </div>
    </div>,
    document.body
  );
}
