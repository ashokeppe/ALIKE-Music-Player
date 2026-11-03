const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res, next) => {
  try {
    const name = (req.body.name || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";

    if (!name) return res.status(400).json({ message: "Name is required" });
    if (!EMAIL.test(email)) return res.status(400).json({ message: "Enter a valid email" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    if (await User.exists({ email })) return res.status(409).json({ message: "Email already registered" });

    const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: sign(user._id), user });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: "Email already registered" });
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    if (!email || !password) return res.status(400).json({ message: "Enter your email and password" });

    // Only an existing account can log in
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ code: "NO_ACCOUNT", message: "No account found with this email. Please create an account first." });
    }
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ code: "BAD_PASSWORD", message: "Incorrect password" });
    }
    res.json({ token: sign(user._id), user });
  } catch (err) {
    next(err);
  }
};

// PUT /api/auth/avatar  { image: "data:image/jpeg;base64,..." }  (empty string removes the picture)
const AVATAR = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
exports.setAvatar = async (req, res, next) => {
  try {
    const image = typeof req.body.image === "string" ? req.body.image : null;
    if (image === null) return res.status(400).json({ message: "Picture is required" });
    if (image && (image.length > 120000 || !AVATAR.test(image))) {
      return res.status(400).json({ message: "Please choose a smaller JPG, PNG or WebP picture" });
    }
    const user = await User.findByIdAndUpdate(req.user.id, { avatar: image }, { new: true });
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    res.json(user);
  } catch (err) {
    next(err);
  }
};

exports.me = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ message: "Account no longer exists" });
    res.json(user);
  } catch (err) {
    next(err);
  }
};
