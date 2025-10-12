import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();
const SECRET = "supersecretkey123";

const USERS = [
  { username: "admin", password: "admin123" }
];

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: "Neteisingi prisijungimo duomenys" });
  }

  const token = jwt.sign(
    { username: user.username },
    SECRET,
    { expiresIn: "8h" }
  );

  res.json({ token });
});

export default router;
