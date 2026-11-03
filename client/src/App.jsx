import { useEffect, useRef, useState } from "react";
import { Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./AuthContext.jsx";
import { usePlayer } from "./PlayerContext.jsx";
import AuthPage from "./pages/Login.jsx";
import Library from "./pages/Library.jsx";
import Favorites from "./pages/Favorites.jsx";
import Albums from "./pages/Albums.jsx";
import AlbumDetail from "./pages/AlbumDetail.jsx";
import Recommended from "./pages/Recommended.jsx";
import Playlists from "./pages/Playlists.jsx";
import PlaylistDetail from "./pages/PlaylistDetail.jsx";
import Upload from "./pages/Upload.jsx";
import PlayerBar from "./components/PlayerBar.jsx";
import QueuePanel from "./components/QueuePanel.jsx";
import NowPlaying from "./components/NowPlaying.jsx";
import { FolderAccessBanner } from "./components/WatchedFolders.jsx";
import { startWatching } from "./folderWatch.js";
import ThemePicker from "./components/ThemePicker.jsx";
import MiniPlayer from "./components/MiniPlayer.jsx";
import MobileTabs from "./components/MobileTabs.jsx";
import AboutModal from "./components/AboutModal.jsx";
import Avatar from "./components/Avatar.jsx";
import Brand from "./components/Brand.jsx";
import ProfileModal from "./components/ProfileModal.jsx";

export default function App() {
  const { user, loading, logout } = useAuth();
  const { clearQueue, current, fullOpen, setFullOpen } = usePlayer();
  const [showQueue, setShowQueue] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const { pathname } = useLocation();
  const mainRef = useRef(null);
  useEffect(() => { mainRef.current?.scrollTo({ top: 0 }); }, [pathname]);
  // Watched folders: import new songs automatically while the app is open
  useEffect(() => (user ? startWatching(user.id) : undefined), [user?.id]);

  if (loading) return <p className="dim" style={{ padding: 24 }}>Loading…</p>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <>
      <div className={`layout ${current ? "has-mini" : ""}`}>
        <nav className="side">
          <h2><Brand /></h2>
          <NavLink to="/" end>Library</NavLink>
          <NavLink to="/for-you">For You</NavLink>
          <NavLink to="/liked">Liked Songs</NavLink>
          <NavLink to="/albums">Albums</NavLink>
          <NavLink to="/playlists">Playlists</NavLink>
          <NavLink to="/upload">Upload</NavLink>
          <ThemePicker />
          <button className="sidebtn" onClick={() => setShowAbout(true)}>ⓘ About</button>
          <div className="who">
            <button className="whobtn" onClick={() => setShowProfile(true)} title="Your profile" aria-label="Your profile">
              <Avatar user={user} />
              <span>{user.name}</span>
            </button>
            <button onClick={() => { setFullOpen(false); clearQueue(); logout(); }}>Log out</button>
          </div>
        </nav>
        <main className="main" ref={mainRef}>
          <FolderAccessBanner />
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/for-you" element={<Recommended />} />
            <Route path="/liked" element={<Favorites />} />
            <Route path="/albums" element={<Albums />} />
            <Route path="/albums/:key" element={<AlbumDetail />} />
            <Route path="/playlists" element={<Playlists />} />
            <Route path="/playlists/:id" element={<PlaylistDetail />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      {showQueue && <QueuePanel onClose={() => setShowQueue(false)} />}
      {fullOpen && current && <NowPlaying onOpenQueue={() => setShowQueue(true)} />}
      <PlayerBar onToggleQueue={() => setShowQueue((s) => !s)} queueOpen={showQueue} />
      <MiniPlayer />
      <MobileTabs onOpenQueue={() => setShowQueue(true)} />
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
