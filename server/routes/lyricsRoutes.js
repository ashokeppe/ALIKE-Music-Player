const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/lyricsController");

const router = express.Router();

router.get("/:id", protect, ctrl.getLyrics);

module.exports = router;
