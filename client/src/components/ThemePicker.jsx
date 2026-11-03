import { useEffect, useRef, useState } from "react";
import Icon from "../icons.jsx";
import { applyTheme, getCustomImage, getMotion, getTheme, getWallpaper, removeCustomImage, setCustomImage, setMotion, setWallpaper, THEMES } from "../themes.js";
import { WALLPAPERS, wallpaperUrl } from "../wallpapers.js";
import { detectLocation, getLocation, LABELS, onWeather, searchPlaces, setLocation } from "../weather.js";

const weatherText = (w) => (w.cond === "clear" && !w.isDay ? "Clear night" : LABELS[w.cond] || "");

export default function ThemePicker({ icon }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(getTheme);
  const [img, setImg] = useState(getCustomImage); // saved custom picture (data URL) or ""
  const [wall, setWall] = useState(getWallpaper); // id of the built-in wallpaper in use, or ""
  const [motion, setMotionOn] = useState(getMotion);
  const [error, setError] = useState("");

  // live weather
  const [wloc, setWloc] = useState(getLocation);
  const [wdata, setWdata] = useState(null);
  const [wq, setWq] = useState("");
  const [wresults, setWresults] = useState([]);
  const [wmsg, setWmsg] = useState("");

  const ref = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => onWeather(setWdata), []);

  // Close when clicking elsewhere or pressing Esc
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const useMyLocation = async () => {
    setWmsg("Asking for your location…");
    try {
      const loc = await detectLocation();
      setLocation(loc);
      setWloc(loc);
      setWmsg("");
    } catch (err) {
      setWmsg(err.message);
    }
  };

  const pick = (id) => {
    applyTheme(id);
    setTheme(id);
    setError("");
    if (id === "weather" && !getLocation()) useMyLocation();
  };

  const searchCity = async (e) => {
    e.preventDefault();
    setWmsg("Searching…");
    try {
      const found = await searchPlaces(wq);
      setWresults(found);
      setWmsg(found.length ? "" : "No place found with that name.");
    } catch (err) {
      setWmsg(err.message);
    }
  };

  const chooseCity = (place) => {
    setLocation(place);
    setWloc(place);
    setWresults([]);
    setWq("");
    setWmsg("");
  };

  const toggleMotion = () => {
    setMotion(!motion);
    setMotionOn(!motion);
  };

  const choosePicture = () => fileRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = ""; // lets the same picture be chosen again later
    if (!file) return;
    try {
      await setCustomImage(file);
      setImg(getCustomImage());
      setWall("");
      setTheme("custom");
      setError("");
    } catch (err) {
      setError(err.message || "Could not use that picture.");
    }
  };

  const removePicture = () => {
    removeCustomImage();
    setImg("");
    setWall("");
    setTheme(getTheme());
    setError("");
  };

  const pickWallpaper = (id) => {
    setWallpaper(id);
    setImg(getCustomImage());
    setWall(id);
    setTheme("custom");
    setError("");
  };

  const wallName = WALLPAPERS.find((w) => w.id === wall)?.name;

  // One picture tile with a short label underneath (used for every kind of theme)
  const tile = (t) => (
    <button
      key={t.id} className={`tile ${t.id === theme ? "on" : ""}`} onClick={() => pick(t.id)}
      role="menuitemradio" aria-checked={t.id === theme} title={t.name}
    >
      <span className={`thumb ${t.group ? "" : "ui"}`} style={{ background: t.swatch[0], "--bar": t.swatch[1] }}>
        {t.id === theme && <b className="tick">✓</b>}
        <i style={{ background: t.swatch[1] }} />
      </span>
      <span className="lbl">{t.short || t.name}</span>
    </button>
  );

  const wallTile = (w) => {
    const on = theme === "custom" && wall === w.id;
    return (
      <button key={w.id} className={`tile ${on ? "on" : ""}`} title={w.name} onClick={() => pickWallpaper(w.id)}>
        <span className="thumb" style={{ backgroundImage: `url("${wallpaperUrl(w.id)}")` }}>{on && <b className="tick">✓</b>}</span>
        <span className="lbl">{w.name}</span>
      </button>
    );
  };

  const section = (title, items) => (
    <>
      <p className="themehead">{title}</p>
      <div className="tilegrid">{items}</div>
    </>
  );

  // Place and temperature for the Live Weather theme (shown under the Animated tiles while it is selected)
  const weatherBox = theme === "weather" && (
    <div className="wxbox wide">
      <p className="wxnow">
        {wloc ? wloc.name : "No place chosen yet"}
        {wdata && wdata.temp != null ? ` · ${Math.round(wdata.temp)}°C · ${weatherText(wdata)}` : ""}
      </p>
      <button onClick={useMyLocation}>Use my location</button>
      <form onSubmit={searchCity}>
        <input placeholder="Search a city…" value={wq} onChange={(e) => setWq(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      {wresults.map((r, i) => (
        <button key={i} className="wxresult" onClick={() => chooseCity(r)}>{r.name}</button>
      ))}
      {wmsg && <p className="themehint">{wmsg}</p>}
    </div>
  );

  return (
    <div className="themepicker" ref={ref}>
      <button className={open ? "open" : ""} onClick={() => setOpen((o) => !o)} title="Change theme">{icon && <Icon name={icon} size={22} />}Theme</button>

      {theme === "weather" && wdata && wdata.temp != null && (
        <p className="wxbadge">
          {Math.round(wdata.temp)}°C · {weatherText(wdata)}
          {wdata.place ? <><br />{wdata.place.split(",")[0]}</> : null}
        </p>
      )}

      {open && (
        <div className="thememenu" role="menu">
          <div className="themelist">
            {section("Colors", THEMES.filter((t) => !t.group).map(tile))}
            {section("Animated", THEMES.filter((t) => t.group === "animated").map(tile))}
            {weatherBox}
            {section("Live wallpapers", THEMES.filter((t) => t.group === "live").map(tile))}
            {section("Wallpapers", WALLPAPERS.map(wallTile))}
          </div>

          <div className="themefoot">
            <label className="themetoggle">
              <input type="checkbox" checked={motion} onChange={toggleMotion} />
              Play animations
            </label>

            <button className={`themeopt ${theme === "custom" ? "on" : ""}`} onClick={() => (img ? pick("custom") : choosePicture())}>
              <span className="swatch" style={img ? { backgroundImage: `url("${img}")` } : undefined}>{!img && "🖼"}</span>
              {wallName ? `Wallpaper: ${wallName}` : "Custom picture"}
              {theme === "custom" && <span className="tick">✓</span>}
            </button>

            {img ? (
              <div className="themecustom">
                <button onClick={choosePicture}>Change picture…</button>
                <button onClick={removePicture}>Remove</button>
              </div>
            ) : (
              <p className="themehint">Pick a picture from your computer to use as the background.</p>
            )}
            {error && <p className="themehint err">{error}</p>}

            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
          </div>
        </div>
      )}
    </div>
  );
}
