const Playlist = require("../models/Playlist");
const Track = require("../models/Track");

// Every playlist belongs to one user; all queries are scoped to req.user.id.

exports.getPlaylists = async (req, res, next) => {
  try {
    res.json(await Playlist.find({ owner: req.user.id }).sort({ createdAt: -1 }));
  } catch (err) {
    next(err);
  }
};

exports.createPlaylist = async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    if (!name) return res.status(400).json({ message: "name is required" });
    res.status(201).json(await Playlist.create({ name, owner: req.user.id }));
  } catch (err) {
    next(err);
  }
};

exports.getPlaylist = async (req, res, next) => {
  try {
    const pl = await Playlist.findOne({ _id: req.params.id, owner: req.user.id }).populate("tracks");
    if (!pl) return res.status(404).json({ message: "Playlist not found" });
    res.json(pl);
  } catch (err) {
    next(err);
  }
};

exports.deletePlaylist = async (req, res, next) => {
  try {
    const pl = await Playlist.findOneAndDelete({ _id: req.params.id, owner: req.user.id });
    if (!pl) return res.status(404).json({ message: "Playlist not found" });
    res.json({ message: "Playlist deleted" });
  } catch (err) {
    next(err);
  }
};

exports.addTrack = async (req, res, next) => {
  try {
    const { trackId } = req.body;
    if (!trackId || !(await Track.exists({ _id: trackId }))) {
      return res.status(404).json({ message: "Track not found" });
    }
    const pl = await Playlist.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $addToSet: { tracks: trackId } },
      { new: true }
    ).populate("tracks");
    if (!pl) return res.status(404).json({ message: "Playlist not found" });
    res.json(pl);
  } catch (err) {
    next(err);
  }
};

exports.removeTrack = async (req, res, next) => {
  try {
    const pl = await Playlist.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $pull: { tracks: req.params.trackId } },
      { new: true }
    ).populate("tracks");
    if (!pl) return res.status(404).json({ message: "Playlist not found" });
    res.json(pl);
  } catch (err) {
    next(err);
  }
};
