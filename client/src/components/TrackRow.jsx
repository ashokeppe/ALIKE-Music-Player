import { useCallback, useRef, useState } from "react";
import api from "../api.js";
import { useAuth } from "../AuthContext.jsx";
import { usePlayer } from "../PlayerContext.jsx";
import { fmt } from "../utils.js";
import { showToast } from "../toast.js";
import EditTrackModal from "./EditTrackModal.jsx";
import RingtoneModal from "./RingtoneModal.jsx";
import RowMenu from "./RowMenu.jsx";
import SongInfoModal from "./SongInfoModal.jsx";

// onUpdated / onDeleted are optional: pass them to show Edit and Delete in the three-dot menu
export default function TrackRow({ track, tracks, i, extra, onUpdated, onDeleted, selectMode, selected, onSelect }) {
  const { current, playTracks, togglePlay, addToQueue, playNext, setFullOpen } = usePlayer();
  const { user, favorites, toggleFavorite } = useAuth();
  const [editing, setEditing] = useState(false);
  const [modal, setModal] = useState(null); // "ringtone" | "callertune" | "info"
  const [menu, setMenu] = useState(null); // position of the three dots while the menu is open
  const dotsRef = useRef(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const active = current?._id === track._id;
  const liked = favorites.has(track._id);
  const mine = !track.owner || track.owner === user.id;
  const canEdit = (onUpdated || onDeleted) && mine;

  // Click the title/artist: play (or pause if it is already the current song)
  const play = () => {
    if (selectMode) return mine && onSelect(track._id); // in select mode a click selects
    return active ? togglePlay() : playTracks(tracks, i);
  };

  // Click the cover: open the full Now Playing screen (starts the song if needed)
  const openPlayer = () => {
    if (!active) playTracks(tracks, i);
    setFullOpen(true);
  };

  const like = () => toggleFavorite(track._id).catch(() => alert("Could not update favorites"));

  // Share: the phone/computer share sheet when available, otherwise copy a link
  const share = async () => {
    const link = `${window.location.origin}/?q=${encodeURIComponent(track.title)}`;
    const text = `${track.title} — ${track.artist}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: track.title, text, url: link });
        return;
      } catch (err) {
        if (err.name === "AbortError") return; // the person closed the share sheet
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${link}`);
      showToast("Link copied to the clipboard");
    } catch {
      window.prompt("Copy this link:", `${text}\n${link}`);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete “${track.title}”? This cannot be undone.`)) return;
    try {
      await api.delete(`/tracks/${track._id}`);
      onDeleted?.(track._id);
    } catch (err) {
      alert(err.response?.data?.message || "Delete failed");
    }
  };

  return (
    <div className={`row ${active ? "active" : ""} ${selected ? "selected" : ""}`}>
      {selectMode && (
        <input
          type="checkbox" className="rowcheck" checked={!!selected} disabled={!mine}
          onChange={() => onSelect(track._id)}
          title={mine ? "Select" : "Uploaded by someone else"}
        />
      )}
      {track.coverUrl ? (
        <img className="cover clickable" src={track.coverUrl} alt="" onClick={openPlayer} title="Open player" />
      ) : (
        <div className="cover clickable" onClick={openPlayer} title="Open player">🎵</div>
      )}
      <div className="meta clickable" onClick={play} title="Click to play">
        <b>{track.title}</b>
        <span>{track.artist}{track.album ? ` · ${track.album}` : ""}</span>
      </div>
      <span className="dim">{fmt(track.duration)}</span>
      {!selectMode && <div className="actions">
        <button className={`fav ${liked ? "on" : ""}`} onClick={like} title={liked ? "Unlike" : "Like"}>
          {liked ? "♥" : "♡"}
        </button>
        <button
          ref={dotsRef} className="dots" title="More options" aria-label="More options" aria-haspopup="menu"
          onClick={() => setMenu((m) => (m ? null : dotsRef.current.getBoundingClientRect()))}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
            <circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" />
          </svg>
        </button>
        {extra}
      </div>}
      {menu && (
        <RowMenu
          anchor={menu} triggerRef={dotsRef} track={track} onClose={closeMenu}
          onNext={() => { playNext(track); showToast("Playing next"); }}
          onQueue={() => { addToQueue(track); showToast("Added to queue"); }}
          onEdit={canEdit && onUpdated ? () => setEditing(true) : null}
          onDelete={canEdit && onDeleted ? remove : null}
          onRingtone={() => setModal("ringtone")}
          onCallerTune={() => setModal("callertune")}
          onInfo={() => setModal("info")}
          onShare={share}
        />
      )}
      {modal === "ringtone" && <RingtoneModal track={track} onClose={() => setModal(null)} />}
      {modal === "callertune" && <RingtoneModal kind="callertune" track={track} onClose={() => setModal(null)} />}
      {modal === "info" && <SongInfoModal track={track} onClose={() => setModal(null)} />}
      {editing && <EditTrackModal track={track} onClose={() => setEditing(false)} onSaved={onUpdated} />}
    </div>
  );
}
