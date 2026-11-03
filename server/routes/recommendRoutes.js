const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/recommendController");

const router = express.Router();

router.get("/", protect, ctrl.getRecommendations);

module.exports = router;
