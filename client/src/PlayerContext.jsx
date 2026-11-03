import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import api from "./api.js";
import { useAuth } from "./AuthContext.jsx";
import { setEqGains } from "./equalizer.js";
import { showToast } from "./toast.js";

const Ctx = createContext(null);
export const usePlayer = () => useContext(Ctx);

export function PlayerProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;

  // One <audio> element for the whole app, so music keeps playing across pages
  const audioRef = useRef(null);
  if (!audioRef.current) audioRef.current = new Audio();
  const a = audioRef.current;

  const [queue, setQueue] = useState([]);
  const [index, setIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off"); // off | all | one
  const [fullOpen, setFullOpen] = useState(false); // Now Playing screen
  const [speed, setSpeedState] = useState(1); // playback speed
  const [eq, setEqState] = useState({ preset: "flat", gains: [0, 0, 0, 0, 0] }); // equalizer
  const [sleep, setSleepState] = useState(null); // sleep timer: null | { kind: "minutes", until, minutes } | { kind: "song" }
  const sleepRef = useRef(null);
  sleepRef.current = sleep;
  const eqTouched = useRef(false); // the person changed the equalizer in this visit
  const eqUsed = useRef(false); // the audio is routed through the equalizer
  const [hydrated, setHydrated] = useState(false); // saved player state has been restored

  // After a page refresh the last song is shown but not loaded until you press play.
  // While that is the case, this holds { id, time } (the song and the saved position).
  const lazyRef = useRef(null);

  // Always-fresh copy of what needs saving (read by the save function)
  const live = useRef({});
  live.current = { userId, queue, index, volume, muted, shuffle, repeat, speed, eq };

  const current = queue[index];

  // ---- Saving and restoring the player state (per account, in this browser) ----
  const persist = useCallback(() => {
    const s = live.current;
    if (!s.userId) return;
    try {
      localStorage.setItem(
        `player-state:${s.userId}`,
        JSON.stringify({
          queue: s.queue,
          index: s.index,
          volume: s.volume,
          muted: s.muted,
          speed: s.speed,
          eq: s.eq,
          shuffle: s.shuffle,
          repeat: s.repeat,
          time: lazyRef.current ? lazyRef.current.time : a.currentTime || 0,
        })
      );
    } catch {
      /* storage full or blocked: ignore */
    }
  }, [a]);

  // Audio element events
  useEffect(() => {
    a.volume = 0.8;
    const h = {
      play: () => setPlaying(true),
      pause: () => setPlaying(false),
      timeupdate: () => setTime(a.currentTime),
      loadedmetadata: () => setDuration(Number.isFinite(a.duration) ? a.duration : 0),
    };
    Object.entries(h).forEach(([k, f]) => a.addEventListener(k, f));
    return () => Object.entries(h).forEach(([k, f]) => a.removeEventListener(k, f));
  }, [a]);

  // Restore the saved queue, song, position, volume, shuffle and repeat when the account is known
  useEffect(() => {
    setHydrated(false);
    if (!userId) return;
    try {
      const s = JSON.parse(localStorage.getItem(`player-state:${userId}`) || "null");
      if (s) {
        if (typeof s.volume === "number") {
          a.volume = s.volume;
          setVolumeState(s.volume);
        }
        a.muted = !!s.muted;
        setMuted(!!s.muted);
        if (typeof s.speed === "number" && s.speed >= 0.25 && s.speed <= 3) {
          a.defaultPlaybackRate = s.speed;
          a.playbackRate = s.speed;
          setSpeedState(s.speed);
        }
        if (s.eq && Array.isArray(s.eq.gains) && s.eq.gains.length === 5) {
          setEqState({ preset: String(s.eq.preset || "custom"), gains: s.eq.gains.map(Number) });
        }
        setShuffle(!!s.shuffle);
        if (["off", "all", "one"].includes(s.repeat)) setRepeat(s.repeat);

        const track = Array.isArray(s.queue) ? s.queue[s.index] : null;
        if (track && track._id && track.streamUrl) {
          lazyRef.current = { id: track._id, time: Number(s.time) || 0 };
          setQueue(s.queue);
          setIndex(s.index);
          // If the song was deleted in the meantime, drop it
          api.get(`/tracks/${track._id}`).catch((err) => {
            if (err.response?.status === 404 && lazyRef.current?.id === track._id) {
              lazyRef.current = null;
              setQueue([]);
              setIndex(-1);
            }
          });
        }
      }
    } catch {
      /* broken saved data: start fresh */
    }
    setHydrated(true);
  }, [userId, a]);

  // Save when something important changes
  useEffect(() => {
    if (hydrated) persist();
  }, [hydrated, queue, index, volume, muted, shuffle, repeat, speed, eq, persist]);

  // Save the position every 2 seconds, and when the page is refreshed or closed
  useEffect(() => {
    if (!hydrated) return;
    const id = setInterval(persist, 2000);
    window.addEventListener("pagehide", persist);
    return () => {
      clearInterval(id);
      window.removeEventListener("pagehide", persist);
    };
  }, [hydrated, persist]);

  // ---- Loading and playing ----
  // Load the audio of a restored song (only when the user actually wants to play it)
  const load = () => {
    const lz = lazyRef.current;
    if (!lz || !current) return;
    lazyRef.current = null;
    a.src = current.streamUrl;
    a.addEventListener("loadedmetadata", () => { a.currentTime = lz.time; }, { once: true });
  };

  // When the current song changes: load and play it (a restored song is only shown)
  useEffect(() => {
    if (!current) {
      lazyRef.current = null;
      a.pause();
      a.removeAttribute("src");
      a.load();
      setTime(0);
      setDuration(0);
      return;
    }
    setDuration(current.duration || 0);
    if (lazyRef.current?.id === current._id) {
      setTime(lazyRef.current.time);
      return;
    }
    lazyRef.current = null;
    setTime(0);
    a.src = current.streamUrl;
    a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?._id]);

  const restart = () => {
    if (lazyRef.current) lazyRef.current.time = 0;
    load();
    a.currentTime = 0;
    a.play().catch(() => {});
  };

  const next = useCallback(
    (auto = false) => {
      if (!queue.length) return;
      if (auto && repeat === "one") return restart();
      let i;
      if (shuffle && queue.length > 1) {
        do i = Math.floor(Math.random() * queue.length);
        while (i === index);
      } else {
        i = index + 1;
      }
      if (i >= queue.length) {
        if (repeat === "all" || !auto) i = 0;
        else return a.pause();
      }
      if (i === index) return restart();
      setIndex(i);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queue, index, repeat, shuffle]
  );

  // Sleep timer (minutes): stop playback when the time is up
  useEffect(() => {
    if (!sleep || sleep.kind !== "minutes") return;
    const id = setTimeout(() => {
      a.pause();
      setSleepState(null);
      showToast("Sleep timer: playback stopped");
    }, Math.max(0, sleep.until - Date.now()));
    return () => clearTimeout(id);
  }, [sleep, a]);

  // Equalizer: the audio only goes through it after the person changed it (or after playing with a saved setting)
  useEffect(() => {
    const flat = eq.gains.every((g) => g === 0);
    if (flat && !eqUsed.current) return;
    if (!eqUsed.current && !eqTouched.current && !playing) return;
    eqUsed.current = true;
    setEqGains(a, eq.gains);
  }, [eq, playing, a]);

  // Auto-advance when a track finishes
  useEffect(() => {
    const onEnded = () => {
      if (sleepRef.current?.kind === "song") {
        // sleep timer set to "end of this song": stop here instead of moving on
        setSleepState(null);
        showToast("Sleep timer: playback stopped");
        return;
      }
      next(true);
    };
    a.addEventListener("ended", onEnded);
    return () => a.removeEventListener("ended", onEnded);
  }, [a, next]);

  const prev = () => {
    if (!queue.length) return;
    if (time > 3 || index <= 0) return restart();
    setIndex(index - 1);
  };

  const togglePlay = () => {
    if (!current) return;
    load();
    a.paused ? a.play().catch(() => {}) : a.pause();
  };

  const playTracks = (tracks, start = 0) => {
    if (!tracks.length) return;
    const same = tracks[start]._id === current?._id;
    setQueue(tracks);
    setIndex(start);
    if (same) {
      if (lazyRef.current) {
        // restored song clicked again: play it from the beginning
        lazyRef.current = null;
        a.src = current.streamUrl;
      }
      a.play().catch(() => {});
    }
  };

  const addToQueue = (track) => {
    setQueue((q) => [...q, track]);
    if (index === -1) setIndex(0);
  };

  const playNext = (track) => {
    if (index === -1) return addToQueue(track);
    setQueue((q) => [...q.slice(0, index + 1), track, ...q.slice(index + 1)]);
  };

  const removeFromQueue = (i) => {
    const q = queue.filter((_, k) => k !== i);
    setQueue(q);
    if (i < index) setIndex(index - 1);
    else if (i === index) setIndex(q.length ? Math.min(index, q.length - 1) : -1);
  };

  const clearQueue = () => {
    setQueue([]);
    setIndex(-1);
  };

  const seek = (t) => {
    if (lazyRef.current) {
      lazyRef.current.time = t; // restored song: remember the position, load on play
      setTime(t);
      return;
    }
    a.currentTime = t;
    setTime(t);
  };

  const setVolume = (v) => {
    a.volume = v;
    setVolumeState(v);
    if (v > 0 && a.muted) {
      // moving the slider un-mutes
      a.muted = false;
      setMuted(false);
    }
  };

  // Volume button: mute / unmute (from zero volume, un-mute to a normal level)
  const toggleMute = () => {
    if (a.muted || volume === 0) {
      if (volume === 0) {
        a.volume = 0.5;
        setVolumeState(0.5);
      }
      a.muted = false;
      setMuted(false);
    } else {
      a.muted = true;
      setMuted(true);
    }
  };

  // Speed: also set the default rate, because loading the next song resets the rate to the default
  const setSpeed = (v) => {
    a.defaultPlaybackRate = v;
    a.playbackRate = v;
    setSpeedState(v);
  };

  // Sleep timer: minutes, "song" (stop when this song ends) or null (off)
  const setSleep = (v) => {
    if (v === null) setSleepState(null);
    else if (v === "song") setSleepState({ kind: "song" });
    else setSleepState({ kind: "minutes", until: Date.now() + v * 60000, minutes: v });
  };

  const setEq = (next) => {
    eqTouched.current = true;
    setEqState(next);
  };

  const cycleRepeat = () => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"));

  return (
    <Ctx.Provider
      value={{
        queue, index, current, playing, time, duration, volume, muted, shuffle, repeat,
        speed, setSpeed, sleep, setSleep, eq, setEq,
        fullOpen, setFullOpen,
        playTracks, addToQueue, playNext, removeFromQueue, clearQueue,
        jumpTo: setIndex, togglePlay, next, prev, seek, setVolume, toggleMute,
        toggleShuffle: () => setShuffle((s) => !s), cycleRepeat,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}
