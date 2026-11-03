const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Track = require("../models/Track");
const Playlist = require("../models/Playlist");
const User = require("../models/User");
const { analyzeAudio } = require("../services/mlClient");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pick = (v) => (typeof v === "string" ? v.trim() : "");
const IMG_EXT = { "image/jpeg": ".jpg", "image/jpg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

// Songs uploaded before accounts existed have no owner; any logged-in user may manage those.
const canModify = (track, userId) => !track.owner || String(track.owner) === String(userId);

const removeFile = (relPath) => {
  if (!relPath) return;
  fs.unlink(path.join(__dirname, "..", relPath.replace(/^\//, "")), () => {});
};

const saveEmbeddedCover = async (b64, mime) => {
  try {
    const name = `${Date.now()}-${crypto.randomBytes(12).toString("hex")}${IMG_EXT[mime] || ".jpg"}`;
    await fs.promises.writeFile(path.join(__dirname, "..", "uploads", "covers", name), Buffer.from(b64, "base64"));
    return `/uploads/covers/${name}`;
  } catch {
    return "";
  }
};

// POST /api/tracks  (multipart: audio, cover?, title?, artist?, album?, genre?, duration?)
// Missing details are filled in by the Python service (ID3 tags, embedded cover art, duration).
exports.createTrack = async (req, res, next) => {
  try {
    const audio = req.files?.audio?.[0];
    const cover = req.files?.cover?.[0];
    if (!audio) return res.status(400).json({ message: "Audio file is required" });

    const body = req.body || {};
    const meta = await analyzeAudio(path.resolve(audio.path), audio.originalname, audio.mimetype);

    let coverUrl = cover ? `/uploads/covers/${cover.filename}` : "";
    if (!coverUrl && meta?.cover_base64) coverUrl = await saveEmbeddedCover(meta.cover_base64, meta.cover_mime);

    const track = await Track.create({
      title: pick(body.title) || meta?.title || path.parse(audio.originalname).name,
      artist: pick(body.artist) || meta?.artist || "Unknown Artist",
      album: pick(body.album) || meta?.album || "",
      genre: pick(body.genre) || meta?.genre || "",
      duration: Number(body.duration) || meta?.duration || 0,
      audioPath: `uploads/audio/${audio.filename}`,
      mimeType: audio.mimetype,
      coverUrl,
      owner: req.user.id,
    });

    res.status(201).json({ ...track.toJSON(), analyzed: !!meta });
  } catch (err) {
    next(err);
  }
};

// GET /api/tracks?q=&page=1&limit=20
exports.getTracks = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const q = (req.query.q || "").trim();

    let filter = {};
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i");
      filter = { $or: [{ title: rx }, { artist: rx }, { album: rx }] };
    }

    const [tracks, total] = await Promise.all([
      Track.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Track.countDocuments(filter),
    ]);
    res.json({ tracks, page, totalPages: Math.ceil(total / limit), total });
  } catch (err) {
    next(err);
  }
};

exports.getTrack = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ message: "Track not found" });
    res.json(track);
  } catch (err) {
    next(err);
  }
};

// PUT /api/tracks/:id  (JSON: title, artist, album, genre)
exports.updateTrack = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ message: "Track not found" });
    if (!canModify(track, req.user.id)) {
      return res.status(403).json({ message: "You can only edit songs you uploaded" });
    }

    let renamed = false;
    for (const k of ["title", "artist"]) {
      if (req.body[k] === undefined) continue;
      const v = pick(req.body[k]);
      if (!v) return res.status(400).json({ message: `${k} cannot be empty` });
      if (track[k] !== v) renamed = true;
      track[k] = v;
    }
    for (const k of ["album", "genre"]) {
      if (req.body[k] !== undefined) track[k] = pick(req.body[k]);
    }

    await track.save();
    // A new title or artist means the saved lyrics may be for the wrong song: look them up again next time
    if (renamed) {
      await Track.updateOne({ _id: track._id }, { $unset: { lyricsSynced: "", lyricsPlain: "", lyricsSource: "", lyricsCheckedAt: "", lyricsVersion: "" } });
    }
    res.json(track);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/tracks/:id
exports.deleteTrack = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ message: "Track not found" });
    if (!canModify(track, req.user.id)) {
      return res.status(403).json({ message: "You can only delete songs you uploaded" });
    }

    await track.deleteOne();
    await Promise.all([
      Playlist.updateMany({ tracks: track._id }, { $pull: { tracks: track._id } }),
      User.updateMany({ favorites: track._id }, { $pull: { favorites: track._id } }),
    ]);
    removeFile(track.audioPath);
    removeFile(track.coverUrl);
    res.json({ message: "Track deleted" });
  } catch (err) {
    next(err);
  }
};

// GET /api/tracks/:id/stream  (HTTP Range supported so seeking works)
exports.streamTrack = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ message: "Track not found" });

    const filePath = path.join(__dirname, "..", track.audioPath);
    let stat;
    try {
      stat = await fs.promises.stat(filePath);
    } catch {
      return res.status(404).json({ message: "Audio file missing on server" });
    }

    const fileSize = stat.size;
    const range = req.headers.range;

    if (!range) {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": track.mimeType,
        "Accept-Ranges": "bytes",
      });
      return fs.createReadStream(filePath).pipe(res);
    }

    const match = /bytes=(\d*)-(\d*)/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      res.status(416).set("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }

    let start;
    let end;
    if (!match[1]) {
      start = Math.max(fileSize - parseInt(match[2], 10), 0);
      end = fileSize - 1;
    } else {
      start = parseInt(match[1], 10);
      end = match[2] ? Math.min(parseInt(match[2], 10), fileSize - 1) : fileSize - 1;
    }

    if (start >= fileSize || start > end) {
      res.status(416).set("Content-Range", `bytes */${fileSize}`);
      return res.end();
    }

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": end - start + 1,
      "Content-Type": track.mimeType,
    });

    const stream = fs.createReadStream(filePath, { start, end });
    stream.on("error", next);
    stream.pipe(res);

    if (start === 0) Track.updateOne({ _id: track._id }, { $inc: { plays: 1 } }).exec();
  } catch (err) {
    next(err);
  }
};
