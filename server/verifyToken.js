import jwt from "jsonwebtoken";

const SECRET = "supersecretkey123";

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Nėra prisijungimo tokeno" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Netinkamas arba pasibaigęs tokenas" });
  }
}
