const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/playlistController");

const router = express.Router();
router.use(protect);

router.route("/").get(ctrl.getPlaylists).post(ctrl.createPlaylist);
router.route("/:id").get(ctrl.getPlaylist).delete(ctrl.deletePlaylist);
router.post("/:id/tracks", ctrl.addTrack);
router.delete("/:id/tracks/:trackId", ctrl.removeTrack);

module.exports = router;
