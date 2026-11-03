import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import api from "../api.js";
import { fetchAllTracks } from "../albums.js";
import { useAuth } from "../AuthContext.jsx";
import { makeAvatar } from "../avatar.js";
import { getCallerTune } from "../callertune.js";
import Avatar from "./Avatar.jsx";
import { usePlayer } from "../PlayerContext.jsx";
import "./profile.css";

// Opens when the user's name / avatar is clicked: who is logged in, and a few numbers about their library
export default function ProfileModal({ onClose }) {
  const { user, logout, updateAvatar } = useAuth();
  const { clearQueue, setFullOpen } = usePlayer();
  const [stats, setStats] = useState(null); // { library, mine, playlists }
  const tune = getCallerTune(user.id);
  const fileRef = useRef(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const choosePhoto = async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // lets the same picture be chosen again
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await updateAvatar(await makeAvatar(file));
    } catch (err) {
      setPhotoError(err.response?.data?.message || err.message || "Could not save the picture");
    }
    setPhotoBusy(false);
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    setPhotoError("");
    try {
      await updateAvatar("");
    } catch (err) {
      setPhotoError(err.response?.data?.message || "Could not remove the picture");
    }
    setPhotoBusy(false);
  };

  useEffect(() => {
    let alive = true;
    Promise.all([fetchAllTracks(), api.get("/playlists")])
      .then(([tracks, lists]) => {
        if (!alive) return;
        setStats({
          library: tracks.length,
          mine: tracks.filter((t) => t.owner === user.id).length,
          playlists: lists.data.length,
        });
      })
      .catch(() => alive && setStats({}));
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      alive = false;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose, user.id]);

  const val = (n) => (stats === null ? "…" : n ?? "—");
  const since = user.createdAt ? new Date(user.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : "—";

  const rows = [
    ["Name", user.name],
    ["Email", user.email],
    ["Member since", since],
    ["Songs you uploaded", val(stats?.mine)],
    ["Songs in the library", val(stats?.library)],
    ["Liked songs", String(user.favorites?.length ?? 0)],
    ["Playlists", val(stats?.playlists)],
    ["Caller tune", tune ? `${tune.title} (${tune.artist})` : "Not set"],
  ];

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal profile" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Your profile">
        <div className="pfhead">
          <button className="avatarbtn" onClick={() => fileRef.current?.click()} disabled={photoBusy} title="Change photo" aria-label="Change profile photo">
            <Avatar user={user} big />
            <span className="cam" aria-hidden="true">{photoBusy ? "…" : "📷"}</span>
          </button>
          <div>
            <h2>{user.name}</h2>
            <p className="dim">{user.email}</p>
          </div>
        </div>
        <div className="pfphoto">
          <button onClick={() => fileRef.current?.click()} disabled={photoBusy}>{user.avatar ? "Change photo" : "Add photo"}</button>
          {user.avatar && <button onClick={removePhoto} disabled={photoBusy}>Remove photo</button>}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={choosePhoto} />
        </div>
        {photoError && <p className="err pferr">{photoError}</p>}
        <dl className="pfrows">
          {rows.map(([k, v]) => (
            <div key={k} className="pfrow"><dt>{k}</dt><dd>{v}</dd></div>
          ))}
        </dl>
        <div className="btns">
          <button onClick={() => { onClose(); setFullOpen(false); clearQueue(); logout(); }}>Log out</button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>,
    document.body
  );
}
