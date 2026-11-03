// A 5-band equalizer built with the Web Audio API.
// The song is only routed through it once a non-flat setting has been used, so normal playback is never affected.

export const BAND_LABELS = ["80 Hz", "250 Hz", "1 kHz", "4 kHz", "12 kHz"];
const FREQUENCIES = [80, 250, 1000, 4000, 12000];

export const PRESETS = [
  { id: "flat", name: "Flat", gains: [0, 0, 0, 0, 0] },
  { id: "bass", name: "Bass boost", gains: [7, 4, 0, 0, 0] },
  { id: "treble", name: "Treble boost", gains: [0, 0, 0, 4, 7] },
  { id: "vocal", name: "Vocal", gains: [-3, -1, 3, 4, 1] },
  { id: "pop", name: "Pop", gains: [-1, 3, 4, 2, -1] },
  { id: "rock", name: "Rock", gains: [5, 3, -2, 3, 5] },
  { id: "classical", name: "Classical", gains: [4, 3, -2, 2, 4] },
  { id: "dance", name: "Dance", gains: [6, 3, 0, 2, 4] },
];

let ctx = null;
let filters = [];
let preamp = null;
let limiter = null;

export function setEqGains(audio, gains) {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const source = ctx.createMediaElementSource(audio);
    filters = FREQUENCIES.map((f, i) => {
      const node = ctx.createBiquadFilter();
      node.type = i === 0 ? "lowshelf" : i === FREQUENCIES.length - 1 ? "highshelf" : "peaking";
      node.frequency.value = f;
      node.Q.value = 1;
      return node;
    });
    preamp = ctx.createGain();
    // a gentle limiter that only works while something is boosted, so boosted sound does not clip
    limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 12;
    limiter.attack.value = 0.003;
    limiter.release.value = 0.15;
    limiter.ratio.value = 1;
    source.connect(filters[0]);
    filters.forEach((node, i) => node.connect(filters[i + 1] || preamp));
    preamp.connect(limiter);
    limiter.connect(ctx.destination);
    // browsers keep an audio context paused until the person has played something
    audio.addEventListener("play", () => {
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    });
  }
  const t = ctx.currentTime;
  gains.forEach((g, i) => filters[i].gain.setTargetAtTime(g, t, 0.02));
  // a little headroom, and the limiter switched on only while something is boosted
  const boost = Math.max(0, ...gains);
  preamp.gain.setTargetAtTime(Math.pow(10, (-boost * 0.25) / 20), t, 0.02);
  limiter.ratio.setTargetAtTime(boost > 0 ? 8 : 1, t, 0.02);
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
}
