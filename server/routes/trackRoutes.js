const express = require("express");
const upload = require("../middleware/upload");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/trackController");

const router = express.Router();

// Browsing and streaming are public (the <audio> tag cannot send a login header).
// Uploading, editing and deleting require a logged-in user.
router.route("/").get(ctrl.getTracks).post(protect, upload, ctrl.createTrack);
router.get("/:id/stream", ctrl.streamTrack);
router
  .route("/:id")
  .get(ctrl.getTrack)
  .put(protect, ctrl.updateTrack)
  .delete(protect, ctrl.deleteTrack);

module.exports = router;
