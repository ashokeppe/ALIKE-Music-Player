require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const path = require("path");

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const trackRoutes = require("./routes/trackRoutes");
const playlistRoutes = require("./routes/playlistRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const recommendRoutes = require("./routes/recommendRoutes");
const lyricsRoutes = require("./routes/lyricsRoutes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET is missing. Add it to your .env file (see .env.example).");
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json({ limit: "200kb" })); // profile pictures are sent as small (about 20-60 KB) images
app.use(morgan("dev"));

// Cover images are public; audio is only served through the stream route
app.use("/uploads/covers", express.static(path.join(__dirname, "uploads/covers")));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/tracks", trackRoutes);
app.use("/api/playlists", playlistRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/recommendations", recommendRoutes);
app.use("/api/lyrics", lyricsRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
});
