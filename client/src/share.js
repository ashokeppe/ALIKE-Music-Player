import { safeName } from "./ringtone.js";
import { showToast } from "./toast.js";

const linkFor = (t) => `${window.location.origin}/?q=${encodeURIComponent(t.title)}`;
const textFor = (t) => `${t.title} — ${t.artist}`;
const EXT = { "audio/mpeg": "mp3", "audio/mp3": "mp3", "audio/mp4": "m4a", "audio/x-m4a": "m4a", "audio/aac": "aac", "audio/flac": "flac", "audio/wav": "wav", "audio/x-wav": "wav", "audio/ogg": "ogg", "audio/webm": "weba" };

// The device's share sheet when there is one, otherwise copy a link
export async function shareLink(track) {
  const link = linkFor(track);
  const text = textFor(track);
  if (navigator.share) {
    try {
      await navigator.share({ title: track.title, text, url: link });
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // the person closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${link}`);
    showToast("Link copied to the clipboard");
  } catch {
    window.prompt("Copy this link:", `${text}\n${link}`);
  }
}

// Shares the audio file itself where the device allows it (most phones, Chrome and Edge on Windows);
// otherwise falls back to sharing a link.
export async function shareFile(track) {
  try {
    if (navigator.share && navigator.canShare) {
      showToast("Preparing the file…");
      const res = await fetch(track.streamUrl);
      if (res.ok) {
        const blob = await res.blob();
        const type = track.mimeType || blob.type || "audio/mpeg";
        const file = new File([blob], `${safeName(track.title)}.${EXT[type] || "mp3"}`, { type });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: track.title, text: textFor(track) });
          return;
        }
      }
    }
  } catch (err) {
    if (err.name === "AbortError") return;
  }
  await shareLink(track);
}
