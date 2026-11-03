// Cuts a part of a decoded song and turns it into a downloadable WAV file.

// Takes `len` seconds starting at `start`, with a short fade in and a longer fade out
export function makeClip(buf, start, len) {
  const rate = buf.sampleRate;
  const from = Math.min(Math.floor(start * rate), Math.max(0, buf.length - 1));
  const frames = Math.max(1, Math.min(Math.floor(len * rate), buf.length - from));
  const fadeIn = Math.min(Math.floor(0.3 * rate), frames);
  const fadeOut = Math.min(Math.floor(1.5 * rate), frames);
  const channels = [];
  for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) {
    const out = buf.getChannelData(c).slice(from, from + frames);
    for (let i = 0; i < fadeIn; i++) out[i] *= i / fadeIn;
    for (let i = 0; i < fadeOut; i++) out[frames - 1 - i] *= i / fadeOut;
    channels.push(out);
  }
  return { channels, sampleRate: rate };
}

// 16-bit PCM WAV
export function encodeWav(channels, sampleRate) {
  const n = channels[0].length;
  const ch = channels.length;
  const buffer = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(buffer);
  const text = (offset, s) => [...s].forEach((c, i) => v.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  v.setUint32(4, 36 + n * ch * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true); // PCM
  v.setUint16(22, ch, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * ch * 2, true);
  v.setUint16(32, ch * 2, true);
  v.setUint16(34, 16, true);
  text(36, "data");
  v.setUint32(40, n * ch * 2, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      o += 2;
    }
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export const safeName = (s) => String(s || "").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim() || "ringtone";

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
