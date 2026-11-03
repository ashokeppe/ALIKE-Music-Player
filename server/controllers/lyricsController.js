const Track = require("../models/Track");
const { findLyrics } = require("../services/lyricsClient");

const DAY = 24 * 60 * 60 * 1000;
// Raise this number whenever the matching rules change: lyrics saved by older rules are looked up again.
const MATCHER_VERSION = 2;

// GET /api/lyrics/:id[?refresh=1]
// Lyrics are looked up automatically the first time and then saved in the database.
exports.getLyrics = async (req, res, next) => {
  try {
    const track = await Track.findById(req.params.id).select(
      "+lyricsSynced +lyricsPlain +lyricsSource +lyricsCheckedAt +lyricsVersion"
    );
    if (!track) return res.status(404).json({ message: "Track not found" });

    const refresh = req.query.refresh === "1";
    const saved = { synced: track.lyricsSynced || "", plain: track.lyricsPlain || "", source: track.lyricsSource || "" };
    const has = !!(saved.synced || saved.plain);
    const current = track.lyricsVersion === MATCHER_VERSION; // saved with today's matching rules

    if (!refresh && current) {
      if (has) return res.json(saved);
      // Looked up recently and nothing was found: don't ask again every time
      if (track.lyricsCheckedAt && Date.now() - track.lyricsCheckedAt < DAY) {
        return res.json({ synced: "", plain: "", source: "", notFound: true });
      }
    }

    let found;
    try {
      found = await findLyrics(track);
    } catch (err) {
      console.warn("Lyrics lookup failed:", err.message);
      return res.status(502).json({ message: "The lyrics service could not be reached" });
    }

    if (found) {
      await Track.updateOne(
        { _id: track._id },
        { $set: { lyricsSynced: found.synced, lyricsPlain: found.plain, lyricsSource: found.source, lyricsCheckedAt: new Date(), lyricsVersion: MATCHER_VERSION } }
      );
      return res.json(found);
    }

    // Nothing convincing found. Lyrics saved by the older, looser matching are removed
    // (they may belong to a different song); lyrics saved by the current rules are kept.
    const update = { $set: { lyricsCheckedAt: new Date(), lyricsVersion: MATCHER_VERSION } };
    if (has && !current) update.$unset = { lyricsSynced: "", lyricsPlain: "", lyricsSource: "" };
    await Track.updateOne({ _id: track._id }, update);

    if (has && current) return res.json(saved);
    res.json({ synced: "", plain: "", source: "", notFound: true });
  } catch (err) {
    next(err);
  }
};
