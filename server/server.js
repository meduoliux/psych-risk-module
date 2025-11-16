// server/server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import routes from "./routes.js";
import dotenv from "dotenv";
import authRouter from "./auth.js";
import jwt from "jsonwebtoken";

import registrationsRouter from "./registrations.js"; // NEW

dotenv.config({ path: new URL("./.env", import.meta.url).pathname });
const SECRET = process.env.JWT_SECRET || "supersecretkey123";

const app = express();

app.use(cors({
  origin: ["http://localhost:5173"],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser()); // ⬅️ nauja

app.get("/health", (req, res) => res.json({ ok: true }));

// Auth maršrutai
app.use("/api/auth", authRouter);
app.use("/api/admin/registrations", registrationsRouter);  // NEW

// Papildomi PK-like maršrutai:
app.get("/api/auth/me", (req, res) => {
  const t = req.cookies?.pk_token;
  if (!t) return res.status(401).json({ error: "Neprisijungęs" });
  try {
    const payload = jwt.verify(t, SECRET);
    return res.json({ user: { username: payload.username, role: payload.role } });
  } catch {
    return res.status(401).json({ error: "Sesija negaliojanti" });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("pk_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  });
  return res.json({ ok: true });
});

// Likę API
app.use("/api", routes);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});