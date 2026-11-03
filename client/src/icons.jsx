// Outline icons (24x24) in one consistent style.
const PATHS = {
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  speed: <><circle cx="12" cy="12" r="9" /><path d="M8.5 8.5 12 12l-3.5 3.5M12.5 8.5 16 12l-3.5 3.5" /></>,
  equalizer: <path d="M4 9v6M8 6v12M12 3v18M16 7v10M20 10v4" />,
  playlistAdd: <path d="M3 6h12M3 12h8M3 18h8M17 14v6M14 17h6" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.6" r=".7" fill="currentColor" /></>,
  bell: <><path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4z" /><path d="M10 21a2 2 0 0 0 4 0" /></>,
  share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.4M8.2 13.2l7.6 4.4" /></>,
  playNext: <><path d="M5 5l9 7-9 7z" /><path d="M18 5v14" /></>,
  queueAdd: <><path d="M3 6h13M3 11h8M3 16h8" /><path d="M18 11v8M15 16l3 3 3-3" /></>,
  edit: <><path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z" /><path d="m13.5 6.5 4 4" /></>,
  trash: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  queue: <><path d="M3 6h12M3 12h12M3 18h7" /><path d="M19 8v8.5" /><circle cx="17" cy="17" r="2" /></>,
  more: <><circle cx="12" cy="5" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="19" r="1.6" fill="currentColor" /></>,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  check: <path d="M5 12l5 5 9-10" />,
  library: <><path d="M9 18V5l11-2v13" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></>,
  sparkle: <><path d="M11 3l1.9 5.1L18 10l-5.1 1.9L11 17l-1.9-5.1L4 10l5.1-1.9z" /><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /></>,
  heart: <path d="M12 21s-7.5-4.6-9.5-9.2A5.3 5.3 0 0 1 12 6.6a5.3 5.3 0 0 1 9.5 5.2C19.5 16.4 12 21 12 21z" />,
  playlists: <><path d="M3 6h14M3 11h14M3 16h7" /><path d="M15 15l6 3.5-6 3.5z" /></>,
  dots: <><circle cx="5" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="19" cy="12" r="1.6" fill="currentColor" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.4 0 2-1 1.6-2.1-.4-1.1.3-2.4 1.6-2.4H17a4 4 0 0 0 4-4c0-5-4-9.5-9-9.5z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" /><circle cx="10.5" cy="7" r="1" fill="currentColor" /><circle cx="15.5" cy="7.5" r="1" fill="currentColor" /></>,
  logout: <><path d="M9 4H5v16h4" /><path d="M16 8l4 4-4 4M20 12H10" /></>,
  phone: <><path d="M6.5 3h3l1.5 4.5-2 1.3a11 11 0 0 0 5.2 5.2l1.3-2L20.5 13v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4.5 5.2 2 2 0 0 1 6.5 3z" /><path d="M15 4.5a5 5 0 0 1 4.5 4.5M15 8a2 2 0 0 1 1.5 1.5" /></>,
  album: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5" /></>,
};

export default function Icon({ name, size = 20, className }) {
  return (
    <svg
      className={className} viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}
