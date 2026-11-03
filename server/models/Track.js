const mongoose = require("mongoose");

const trackSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    album: { type: String, trim: true, default: "" },
    genre: { type: String, trim: true, default: "" },
    duration: { type: Number, default: 0 }, // seconds
    audioPath: { type: String, required: true },
    mimeType: { type: String, default: "audio/mpeg" },
    coverUrl: { type: String, default: "" },
    plays: { type: Number, default: 0 },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // who uploaded it
    // Lyrics found automatically (only loaded when asked for)
    lyricsSynced: { type: String, select: false },
    lyricsPlain: { type: String, select: false },
    lyricsSource: { type: String, select: false },
    lyricsCheckedAt: { type: Date, select: false },
    lyricsVersion: { type: Number, select: false }, // which matching rules found them
  },
  { timestamps: true }
);

trackSchema.virtual("streamUrl").get(function () {
  return `/api/tracks/${this._id}/stream`;
});

trackSchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    delete ret.id;
    delete ret.__v;
    delete ret.audioPath; // don't expose server file paths
    return ret;
  },
});

module.exports = mongoose.model("Track", trackSchema);
