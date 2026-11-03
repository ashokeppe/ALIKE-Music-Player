const User = require("../models/User");
const Track = require("../models/Track");

const ids = (user) => user.favorites.map(String);

// GET /api/favorites -> full track objects, most recently liked first
exports.list = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).populate("favorites");
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    res.json([...user.favorites].reverse());
  } catch (err) {
    next(err);
  }
};

// POST /api/favorites/:trackId -> { favorites: [ids] }
exports.add = async (req, res, next) => {
  try {
    if (!(await Track.exists({ _id: req.params.trackId }))) {
      return res.status(404).json({ message: "Track not found" });
    }
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { favorites: req.params.trackId } },
      { new: true }
    );
    res.json({ favorites: ids(user) });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/favorites/:trackId
exports.remove = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { favorites: req.params.trackId } },
      { new: true }
    );
    res.json({ favorites: ids(user) });
  } catch (err) {
    next(err);
  }
};
