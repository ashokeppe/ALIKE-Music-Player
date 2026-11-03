// Reads song details (title, artist, album, genre, cover art) from an MP3's ID3 tags,
// entirely in the browser, so imports work even when the Python service is offline.
// Files without tags (or non-MP3 files) simply return empty values.

const latin1 = (b) => new TextDecoder("windows-1252").decode(b);

const decodeText = (bytes, enc) => {
  try {
    if (enc === 1) {
      if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes.subarray(2));
      const skip = bytes[0] === 0xff && bytes[1] === 0xfe ? 2 : 0;
      return new TextDecoder("utf-16le").decode(bytes.subarray(skip));
    }
    if (enc === 2) return new TextDecoder("utf-16be").decode(bytes);
    if (enc === 3) return new TextDecoder("utf-8").decode(bytes);
    return latin1(bytes);
  } catch {
    return "";
  }
};

// Several artists are stored separated by NUL: "Adnan Sami\0Kalpana" -> "Adnan Sami, Kalpana"
const textFrame = (data) =>
  decodeText(data.subarray(1), data[0])
    .split("\u0000")
    .map((s) => s.replace(/\uFEFF/g, "").trim())
    .filter(Boolean)
    .join(", ");

const syncsafe = (b) => ((b[0] & 0x7f) << 21) | ((b[1] & 0x7f) << 14) | ((b[2] & 0x7f) << 7) | (b[3] & 0x7f);
const uint32 = (b) => ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;

const deunsync = (b) => {
  const out = new Uint8Array(b.length);
  let n = 0;
  for (let i = 0; i < b.length; i++) {
    out[n++] = b[i];
    if (b[i] === 0xff && b[i + 1] === 0x00) i++;
  }
  return out.subarray(0, n);
};

const parseApic = (data, v22) => {
  const enc = data[0];
  let p = 1;
  if (v22) {
    p = 4; // 3-letter image format
  } else {
    const end = data.indexOf(0, p); // MIME type, NUL-terminated
    if (end < 0) return null;
    p = end + 1;
  }
  p += 1; // picture type
  if (enc === 1 || enc === 2) {
    while (p + 1 < data.length && !(data[p] === 0 && data[p + 1] === 0)) p += 2;
    p += 2;
  } else {
    while (p < data.length && data[p] !== 0) p++;
    p += 1;
  }
  const bytes = data.subarray(p);
  // Detect the real image type from the first bytes instead of trusting the tag
  const type =
    bytes[0] === 0xff && bytes[1] === 0xd8 ? "image/jpeg" : bytes[0] === 0x89 && bytes[1] === 0x50 ? "image/png" : null;
  return type && bytes.length > 100 ? { bytes, type } : null;
};

const FRAMES = {
  TIT2: "title", TT2: "title",
  TPE1: "artist", TP1: "artist",
  TPE2: "albumArtist", TP2: "albumArtist",
  TALB: "album", TAL: "album",
  TCON: "genre", TCO: "genre",
  APIC: "cover", PIC: "cover",
};

const readV2 = async (file) => {
  const head = new Uint8Array(await file.slice(0, 10).arrayBuffer());
  if (head[0] !== 0x49 || head[1] !== 0x44 || head[2] !== 0x33) return null; // "ID3"
  const ver = head[3];
  if (ver < 2 || ver > 4) return null;
  const flags = head[5];
  const size = syncsafe(head.subarray(6, 10));

  let buf = new Uint8Array(await file.slice(10, 10 + size).arrayBuffer());
  if (flags & 0x80) buf = deunsync(buf);

  let pos = 0;
  if (ver >= 3 && flags & 0x40) pos = ver === 4 ? syncsafe(buf.subarray(0, 4)) : uint32(buf.subarray(0, 4)) + 4;

  const idLen = ver === 2 ? 3 : 4;
  const hdrLen = ver === 2 ? 6 : 10;
  const out = {};

  while (pos + hdrLen <= buf.length) {
    if (buf[pos] === 0) break; // padding
    const id = latin1(buf.subarray(pos, pos + idLen));
    const fsize =
      ver === 2
        ? (buf[pos + 3] << 16) | (buf[pos + 4] << 8) | buf[pos + 5]
        : ver === 4
        ? syncsafe(buf.subarray(pos + 4, pos + 8))
        : uint32(buf.subarray(pos + 4, pos + 8));
    const start = pos + hdrLen;
    const end = start + fsize;
    if (fsize <= 0 || end > buf.length) break;

    const key = FRAMES[id];
    const data = buf.subarray(start, end);
    if (key === "cover") {
      if (!out.cover) out.cover = parseApic(data, ver === 2);
    } else if (key) {
      const v = textFrame(data);
      if (v && !out[key]) out[key] = v;
    }
    pos = end;
  }
  return out;
};

// Old-style tag stored in the last 128 bytes of the file
const readV1 = async (file) => {
  if (file.size < 128) return null;
  const b = new Uint8Array(await file.slice(file.size - 128).arrayBuffer());
  if (latin1(b.subarray(0, 3)) !== "TAG") return null;
  const field = (s, e) => latin1(b.subarray(s, e)).replace(/\u0000[\s\S]*$/, "").trim();
  return { title: field(3, 33), artist: field(33, 63), album: field(63, 93) };
};

export async function readTags(file) {
  try {
    const v2 = (await readV2(file)) || {};
    const v1 = !v2.title || !v2.artist ? (await readV1(file)) || {} : {};

    let genre = (v2.genre || "").replace(/^\(\d+\)\s*/, "");
    if (/^\d+$/.test(genre)) genre = "";

    const cover = v2.cover
      ? new File([v2.cover.bytes], v2.cover.type === "image/png" ? "cover.png" : "cover.jpg", { type: v2.cover.type })
      : null;

    return {
      title: v2.title || v1.title || "",
      artist: v2.artist || v2.albumArtist || v1.artist || "",
      album: v2.album || v1.album || "",
      genre,
      cover,
    };
  } catch {
    return { title: "", artist: "", album: "", genre: "", cover: null };
  }
}
