// An album's cover: the first song's cover art, or a colored tile with the first letter
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export default function AlbumCover({ album, className = "" }) {
  if (album.coverUrl) return <img className={`albumcover ${className}`} src={album.coverUrl} alt="" />;
  const hue = hash(album.name) % 360;
  return (
    <div className={`albumcover ${className}`} style={{ background: `linear-gradient(135deg, hsl(${hue} 55% 38%), hsl(${(hue + 50) % 360} 60% 22%))` }}>
      {album.name.slice(0, 1).toUpperCase()}
    </div>
  );
}
