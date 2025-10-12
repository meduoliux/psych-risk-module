import express from "express";
import db from "./db.js";
import { nanoid } from "nanoid";
import { computeScore, mapRating } from "./risk.js";
import { verifyToken } from "./verifyToken.js";

const router = express.Router();

// Frontend bazinis adresas, naudojamas kuriant pilnas nuorodas
const FRONTEND_BASE_URL = process.env.FRONTEND_URL || "http://localhost:5173";

/* ======================================================
   ✅ Klausimų gavimas
====================================================== */
router.get("/questions", (req, res) => {
  const rows = db
    .prepare("SELECT id, order_no, text, min_label, max_label FROM questions ORDER BY order_no")
    .all();
  res.json(rows);
});

/* ======================================================
   ✅ Admin: sukurti naują nuorodą
====================================================== */
router.post("/admin/invite", verifyToken, (req, res) => {
  const { ttlMinutes = 1440, personal_code } = req.body;
  if (!personal_code) return res.status(400).json({ error: "Trūksta asmens kodo" });

  const token = nanoid(24);
  const now = Date.now();
  const expires = now + ttlMinutes * 60 * 1000;

  db.prepare(`
    INSERT INTO invite_links (token, personal_code, created_at, expires_at, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(token, personal_code, now, expires, "Neužpildytas");

  const url = `${FRONTEND_BASE_URL}/q/${token}`;

  res.json({
    token,
    personal_code,
    url,
    expires_at: expires,
  });
});

/* ======================================================
   ✅ Patikrinti ar nuoroda galioja (viešai)
====================================================== */
router.get("/invite/:token", (req, res) => {
  const { token } = req.params;

  if (typeof token !== "string" || token.length < 10) {
    return res.status(400).json({ error: "Neteisingas token formatas" });
  }

  const link = db
    .prepare("SELECT token, created_at, expires_at, used_at, status FROM invite_links WHERE token=?")
    .get(token);

  if (!link) return res.status(404).json({ error: "Nerasta" });
  if (link.used_at) return res.status(410).json({ error: "Nuoroda jau panaudota" });
  if (Date.now() > link.expires_at) return res.status(410).json({ error: "Nuoroda nebegalioja" });

  res.json({ ok: true, token });
});

/* ======================================================
   ✅ Pateikti atsakymus (offline-ready: kai serveris yra)
====================================================== */
router.post("/submit", (req, res) => {
  const { token, answers } = req.body || {};

  if (typeof token !== "string" || token.length < 10) {
    return res.status(400).json({ error: "Neteisingas token formatas" });
  }
  if (!Array.isArray(answers) || answers.length === 0) {
    return res.status(400).json({ error: "Trūksta atsakymų" });
  }

  const link = db.prepare("SELECT * FROM invite_links WHERE token=?").get(token);
  if (!link) return res.status(404).json({ error: "Neteisinga nuoroda" });
  if (link.used_at) return res.status(410).json({ error: "Nuoroda jau panaudota" });
  if (Date.now() > link.expires_at) return res.status(410).json({ error: "Nuoroda nebegalioja" });

  const enriched = answers.map((a) => {
    const q = db.prepare("SELECT order_no FROM questions WHERE id=?").get(a.questionId);
    return { ...a, order_no: q?.order_no };
  });

  const score = computeScore(enriched);
  const rating = mapRating(score);
  const now = Date.now();

  db.transaction(() => {
    db.prepare(`
      UPDATE invite_links
      SET used_at=?, status='Užpildytas', score=?, rating=?
      WHERE token=?
    `).run(now, score, rating, token);

    db.prepare(`
      INSERT INTO responses (token, submitted_at, score, rating, answers_json)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(token) DO UPDATE SET
        submitted_at=excluded.submitted_at,
        score=excluded.score,
        rating=excluded.rating,
        answers_json=excluded.answers_json
    `).run(token, now, score, rating, JSON.stringify(answers));
  })();

  res.json({ ok: true, score, rating });
});

/* ======================================================
   ✅ Admin: gauti visus rezultatus (su pilnom nuorodom)
====================================================== */
router.get("/admin/results", verifyToken, (req, res) => {
  const rows = db
    .prepare(`
      SELECT l.personal_code, l.token, l.created_at, l.expires_at,
             l.used_at, l.status, l.score, l.rating
      FROM invite_links l
      ORDER BY l.created_at DESC
    `)
    .all();

  const now = Date.now();
  const withExtras = rows.map((r) => {
    let status = r.status || "Neužpildytas";
    if (!r.used_at && now > r.expires_at) status = "Nebegalioja";
    const url = `${FRONTEND_BASE_URL}/q/${r.token}`;
    return { ...r, status, url };
  });

  res.json(withExtras);
});

export default router;
