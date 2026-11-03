import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../AuthContext.jsx";
import { clearCallerTune, getCallerTune, setCallerTune } from "../callertune.js";
import { usePlayer } from "../PlayerContext.jsx";
import { downloadBlob, encodeWav, makeClip, safeName } from "../ringtone.js";
import { showToast } from "../toast.js";
import { fmt } from "../utils.js";
import "./rowmenu.css";

// kind="ringtone" (default) or kind="callertune": the same clip editor, with different wording and a "save" step
export default function RingtoneModal({ track, onClose, kind = "ringtone" }) {
  const { playing, togglePlay } = usePlayer();
  const { user } = useAuth();
  const isCT = kind === "callertune";
  const [saved, setSaved] = useState(() => (isCT ? getCallerTune(user.id) : null));
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [duration, setDuration] = useState(0);
  const [len, setLen] = useState(30);
  const [start, setStart] = useState(0);
  const [previewing, setPreviewing] = useState(false);
  const ctxRef = useRef(null);
  const bufRef = useRef(null);
  const srcRef = useRef(null);
  const pausedOnce = useRef(false);

  const stopPreview = () => {
    try { srcRef.current?.stop(); } catch { /* already stopped */ }
    srcRef.current = null;
    setPreviewing(false);
  };

  // Load and decode the song (the page's own player is paused so the preview is clear)
  useEffect(() => {
    if (playing && !pausedOnce.current) {
      pausedOnce.current = true;
      togglePlay();
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(track.streamUrl);
        if (!res.ok) throw new Error("load failed");
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (cancelled) { ctx.close(); return; }
        ctxRef.current = ctx;
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        if (cancelled) return;
        bufRef.current = buf;
        setDuration(buf.duration);
        setStart(Math.min(Math.round(buf.duration * 0.25), Math.max(0, Math.floor(buf.duration - 30))));
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
      try { srcRef.current?.stop(); } catch { /* ignore */ }
      ctxRef.current?.close?.();
      ctxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const maxStart = Math.max(0, duration - len);
  const realLen = Math.max(0, Math.min(len, duration - start));

  const changeLen = (n) => {
    stopPreview();
    setLen(n);
    setStart((s) => Math.min(s, Math.max(0, duration - n)));
  };

  const preview = async () => {
    if (previewing) return stopPreview();
    const ctx = ctxRef.current;
    if (!ctx || !bufRef.current) return;
    await ctx.resume();
    const clip = makeClip(bufRef.current, start, len);
    const b = ctx.createBuffer(clip.channels.length, clip.channels[0].length, clip.sampleRate);
    clip.channels.forEach((data, i) => b.copyToChannel(data, i));
    const src = ctx.createBufferSource();
    src.buffer = b;
    src.connect(ctx.destination);
    src.onended = () => {
      if (srcRef.current === src) {
        srcRef.current = null;
        setPreviewing(false);
      }
    };
    src.start();
    srcRef.current = src;
    setPreviewing(true);
  };

  const download = () => {
    const clip = makeClip(bufRef.current, start, len);
    downloadBlob(encodeWav(clip.channels, clip.sampleRate), `${safeName(track.title)} ${isCT ? "caller tune" : "ringtone"}.wav`);
    showToast(isCT ? "Caller tune clip downloaded" : "Ringtone downloaded");
  };

  const saveTune = () => {
    const tune = { trackId: track._id, title: track.title, artist: track.artist, start, len: realLen };
    if (setCallerTune(user.id, tune)) {
      setSaved({ ...tune, savedAt: Date.now() });
      showToast("Saved as your caller tune");
    } else {
      showToast("Could not save in this browser");
    }
  };

  const removeTune = () => {
    clearCallerTune(user.id);
    setSaved(null);
    showToast("Caller tune removed");
  };

  const isSavedHere = saved?.trackId === track._id;

  return createPortal(
    <div className="overlay" onClick={onClose}>
      <div className="modal rt" onClick={(e) => e.stopPropagation()}>
        <h2>{isCT ? "Set caller tune" : "Set ringtone"}</h2>
        <p className="rtnote">
          {isCT
            ? "A caller tune is what people hear while your phone is ringing. Only your mobile operator can play it, so a website can't switch it on for you. Pick the best part of the song here: the app remembers it as your caller tune, and you can download the clip to use with your operator's caller tune service."
            : "A website can't change your phone's ringtone. Choose the part you want here, download it as a ringtone file, and then set that file as the ringtone on your phone."}
        </p>
        {isCT && saved && (
          <p className="rtcurrent">
            ✓ Your caller tune: <b>{saved.title}</b> · {fmt(saved.start)}–{fmt(saved.start + saved.len)}
            <button className="rtlink" onClick={removeTune}>Remove</button>
          </p>
        )}
        <div className="meta"><b>{track.title}</b><span>{track.artist}</span></div>

        {status === "loading" && <p className="dim">Preparing the song…</p>}
        {status === "error" && <p className="err">Could not load this song's audio.</p>}

        {status === "ready" && (
          <>
            <label>
              Length
              <div className="rtlens">
                {[15, 20, 30].map((n) => (
                  <button key={n} className={len === n ? "on" : ""} onClick={() => changeLen(n)}>{n} sec</button>
                ))}
              </div>
            </label>
            <label>
              <span>Starts at <b>{fmt(start)}</b> · ends at <b>{fmt(start + realLen)}</b></span>
              <input
                type="range" min="0" max={maxStart} step="0.5" value={Math.min(start, maxStart)}
                onChange={(e) => { stopPreview(); setStart(Number(e.target.value)); }}
              />
            </label>
            <div className="btns">
              <button onClick={preview}>{previewing ? "■ Stop" : "▶ Preview"}</button>
              {isCT ? (
                <>
                  <button onClick={download}>Download clip</button>
                  <button className="primary" onClick={saveTune}>{isSavedHere ? "Update caller tune" : "Save as my caller tune"}</button>
                </>
              ) : (
                <button className="primary" onClick={download}>Download ringtone</button>
              )}
            </div>
            {isCT ? (
              <details className="rthelp">
                <summary>How to get it on your phone</summary>
                <p>Mobile operators (for example Jio, Airtel and Vi) have a caller tune service in their app or on their website. Open it, look for the caller tune or “Hello Tunes” section and choose a song, or upload the clip you downloaded here if your operator allows custom clips.</p>
                <p>What is available, and the price, depends on your operator and country.</p>
              </details>
            ) : (
              <details className="rthelp">
                <summary>How to set it on your phone</summary>
                <p><b>Android:</b> copy the downloaded file to your phone, then open Settings → Sound → Phone ringtone → Add ringtone and choose it.</p>
                <p><b>iPhone:</b> iPhones need the .m4r format. Open the file in GarageBand on your iPhone or Mac, share it as a ringtone, then pick it under Settings → Sounds &amp; Haptics → Ringtone.</p>
              </details>
            )}
          </>
        )}
        <div className="btns"><button onClick={onClose}>Close</button></div>
      </div>
    </div>,
    document.body
  );
}
