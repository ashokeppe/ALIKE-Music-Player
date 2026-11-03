const express = require("express");
const { protect } = require("../middleware/auth");
const ctrl = require("../controllers/authController");

const router = express.Router();

router.post("/register", ctrl.register);
router.post("/login", ctrl.login);
router.get("/me", protect, ctrl.me);
router.put("/avatar", protect, ctrl.setAvatar);

module.exports = router;
