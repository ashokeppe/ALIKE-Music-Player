const multer = require("multer");
const path = require("path");
const crypto = require("crypto");

const storage = multer.diskStorage({
  destination: (_req, file, cb) => {
    cb(null, file.fieldname === "cover" ? "uploads/covers" : "uploads/audio");
  },
  filename: (_req, file, cb) => {
    const unique = crypto.randomBytes(12).toString("hex");
    cb(null, `${Date.now()}-${unique}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.fieldname === "audio" && file.mimetype.startsWith("audio/")) return cb(null, true);
  if (file.fieldname === "cover" && file.mimetype.startsWith("image/")) return cb(null, true);
  cb(new Error(`Invalid file type for field "${file.fieldname}"`));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// Expects: audio (required), cover (optional)
module.exports = upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "cover", maxCount: 1 },
]);
