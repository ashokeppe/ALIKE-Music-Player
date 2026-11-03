const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/favoriteController");

const router = express.Router();
router.use(protect);

router.get("/", ctrl.list);
router.post("/:trackId", ctrl.add);
router.delete("/:trackId", ctrl.remove);

module.exports = router;
