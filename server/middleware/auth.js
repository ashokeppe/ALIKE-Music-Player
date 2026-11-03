const jwt = require("jsonwebtoken");

// Requires "Authorization: Bearer <token>"
exports.protect = (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: "Not logged in" });
  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id };
    next();
  } catch {
    res.status(401).json({ message: "Session expired, please log in again" });
  }
};
