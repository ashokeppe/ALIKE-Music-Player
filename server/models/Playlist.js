const mongoose = require("mongoose");

const playlistSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    tracks: [{ type: mongoose.Schema.Types.ObjectId, ref: "Track" }],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Playlist", playlistSchema);
