import { useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../AuthContext.jsx";
import { usePlayer } from "../PlayerContext.jsx";
import Icon from "../icons.jsx";
import ThemePicker from "./ThemePicker.jsx";
import AboutModal from "./AboutModal.jsx";
import ProfileModal from "./ProfileModal.jsx";
import Avatar from "./Avatar.jsx";

// Bottom tab bar for phones (the sidebar is hidden there). "More" holds the less-used items.
export default function MobileTabs({ onOpenQueue }) {
  const { user, logout } = useAuth();
  const { queue, clearQueue, setFullOpen } = usePlayer();
  const [more, setMore] = useState(false);
  const [about, setAbout] = useState(false);
  const [profile, setProfile] = useState(false);

  const tab = (to, icon, label, end) => (
    <NavLink to={to} end={end} onClick={() => setMore(false)}>
      <Icon name={icon} size={22} />
      <span>{label}</span>
    </NavLink>
  );

  return (
    <>
      <nav className="tabs" aria-label="Main">
        {tab("/", "library", "Library", true)}
        {tab("/albums", "album", "Albums")}
        {tab("/liked", "heart", "Liked")}
        {tab("/playlists", "playlists", "Playlists")}
        <button className={more ? "on" : ""} onClick={() => setMore((m) => !m)} aria-expanded={more}>
          <Icon name="dots" size={22} />
          <span>More</span>
        </button>
      </nav>

      {more && (
        <div className="moresheet-backdrop" onClick={() => setMore(false)}>
          <div className="moresheet" onClick={(e) => e.stopPropagation()}>
            <button className="msitem" onClick={() => { setMore(false); setProfile(true); }}>
              <Avatar user={user} />
              <span>{user.name}<br /><small className="dim">View your profile</small></span>
            </button>
            <NavLink className="msitem" to="/for-you" onClick={() => setMore(false)}>
              <Icon name="sparkle" size={22} />For You
            </NavLink>
            <button className="msitem" onClick={() => { setMore(false); onOpenQueue(); }}>
              <Icon name="queue" size={22} />Queue<span className="msval">{queue.length}</span>
            </button>
            <NavLink className="msitem" to="/upload" onClick={() => setMore(false)}>
              <Icon name="upload" size={22} />Import songs
            </NavLink>
            <ThemePicker icon="palette" />
            <button className="msitem" onClick={() => { setMore(false); setAbout(true); }}>
              <Icon name="info" size={22} />About
            </button>
            <button className="msitem" onClick={() => { setMore(false); setFullOpen(false); clearQueue(); logout(); }}>
              <Icon name="logout" size={22} />Log out
            </button>
          </div>
        </div>
      )}
      {about && <AboutModal onClose={() => setAbout(false)} />}
      {profile && <ProfileModal onClose={() => setProfile(false)} />}
    </>
  );
}
