import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api.js";
import Icon from "../icons.jsx";
import { showToast } from "../toast.js";
import "./rowmenu.css";

// The menu that opens from the three dots on a song. Pass null for options that should not appear.
export default function RowMenu({ anchor, triggerRef, track, onClose, onNext, onQueue, onEdit, onDelete, onRingtone, onCallerTune, onInfo, onShare }) {
  const ref = useRef(null);
  const [view, setView] = useState("main"); // main | playlists
  const [lists, setLists] = useState(null);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });

  // Close when clicking elsewhere, pressing Esc, scrolling the page or resizing the window
  useEffect(() => {
    const onDown = (e) => {
      if (!ref.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) onClose();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    const onScroll = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onClose);
    };
  }, [onClose, triggerRef]);

  // Place it under the dots (or above them when there is no room), kept inside the window
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const pad = 8;
    const left = Math.max(pad, Math.min(anchor.right - width, window.innerWidth - width - pad));
    let top = anchor.bottom + 4;
    if (top + height > window.innerHeight - pad) top = Math.max(pad, anchor.top - height - 4);
    setPos({ left, top });
  }, [anchor, view, lists]);

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

  return createPortal(
    <div className="rowmenu" ref={ref} style={pos} role="menu">
      {view === "main" ? (
        <>
          <button onClick={run(onNext)}><Icon name="playNext" />Play next</button>
          <button onClick={run(onQueue)}><Icon name="queueAdd" />Add to queue</button>
          <button onClick={openPlaylists}><Icon name="playlistAdd" />Add to playlist<Icon name="chevron" size={16} className="chev" /></button>
          {onEdit && <button onClick={run(onEdit)}><Icon name="edit" />Edit</button>}
          {onDelete && <button className="mi-danger" onClick={run(onDelete)}><Icon name="trash" />Delete</button>}
          <hr />
          <button onClick={run(onRingtone)}><Icon name="bell" />Set ringtone</button>
          {onCallerTune && <button onClick={run(onCallerTune)}><Icon name="phone" />Set caller tune</button>}
          <button onClick={run(onInfo)}><Icon name="info" />Song info</button>
          <button onClick={run(onShare)}><Icon name="share" />Share</button>
        </>
      ) : (
        <>
          <button className="mh" onClick={() => setView("main")}><Icon name="back" size={16} />Add to playlist</button>
          {lists === null && <p className="mnote">Loading…</p>}
          {lists && !lists.length && <p className="mnote">No playlists yet. Create one in the Playlists tab.</p>}
          {(lists || []).map((pl) => (
            <button key={pl._id} onClick={() => addTo(pl)}>{pl.name}</button>
          ))}
        </>
      )}
    </div>,
    document.body
  );
}
