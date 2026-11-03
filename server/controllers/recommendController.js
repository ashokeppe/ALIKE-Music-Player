const User = require("../models/User");
const Track = require("../models/Track");
const { recommend } = require("../services/mlClient");

const slim = (t) => ({
  id: String(t._id),
  title: t.title,
  artist: t.artist,
  album: t.album || "",
  genre: t.genre || "",
  duration: t.duration || 0,
  plays: t.plays || 0,
});

// Used only when the Python service is not reachable
const basicRank = (liked, candidates) => {
  const artists = new Set(liked.map((t) => t.artist.toLowerCase()));
  const genres = new Set(liked.map((t) => (t.genre || "").toLowerCase()).filter(Boolean));
  const score = (t) =>
    (artists.has(t.artist.toLowerCase()) ? 2 : 0) + (t.genre && genres.has(t.genre.toLowerCase()) ? 1 : 0);
  return [...candidates].sort((a, b) => score(b) - score(a) || b.plays - a.plays).map((t) => String(t._id));
};

// GET /api/recommendations
exports.getRecommendations = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Account no longer exists" });

    const favIds = user.favorites.map(String);
    const [liked, candidates] = await Promise.all([
      Track.find({ _id: { $in: favIds } }),
      Track.find({ _id: { $nin: favIds } }).sort({ plays: -1 }).limit(500),
    ]);

    let engine = "python";
    let reason = "";
    let ranked = null;

    const out = await recommend(liked.map(slim), candidates.map(slim), 20);
    if (out) {
      ranked = out.ids;
      reason = out.reason || "";
    } else {
      engine = "basic";
      ranked = basicRank(liked, candidates).slice(0, 20);
    }

    const byId = new Map(candidates.map((t) => [String(t._id), t]));
    res.json({ engine, reason, tracks: ranked.map((id) => byId.get(id)).filter(Boolean) });
  } catch (err) {
    next(err);
  }
};
