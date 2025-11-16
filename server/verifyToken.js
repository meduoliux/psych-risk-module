// server/verifyToken.js
import jwt from "jsonwebtoken";
const SECRET = process.env.JWT_SECRET || "supersecretkey123";

export function verifyToken(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Token trūksta" });
  try {
    const payload = jwt.verify(token, SECRET);
    req.user = payload; // {username, role}
    next();
  } catch (e) {
    return res.status(401).json({ error: "Netinkamas token" });
  }
}

export function requireRole(role) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ error: "Neautorizuota" });
    if (req.user.role !== role) return res.status(403).json({ error: "Draudžiama" });
    next();
  };
}
