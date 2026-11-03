const multer = require("multer");

const notFound = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: err.message });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid ID" });
  }
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
};

module.exports = { notFound, errorHandler };
