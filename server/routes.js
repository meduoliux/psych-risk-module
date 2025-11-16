import { Router } from "express";
import { v4 as uuidv4 } from "uuid";
import db from "./db.js";
import {
  sendInviteEmail,
  sendPasswordResetEmail,
  sendRegistrationVerificationEmail,
  sendRegistrationApprovedEmail,
  sendContactEmail,             // 👈 nauja
} from "./email.js";

import jwt from "jsonwebtoken";              // 👈 PRIDĖK ŠITĄ


const router = Router();
const SECRET = process.env.JWT_SECRET || "supersecretkey123";

// 🔹 Pagalbinė funkcija – iš Authorization: Bearer <token> ištraukiam vartotoją
function getCreatedBy(req) {
  const auth = String(req.headers.authorization || "");
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const raw = m[1].trim();

  // 1) Pirmiausia bandome traktuoti kaip JWT (kaip /api/auth/login grąžina)
  try {
    const decoded = jwt.verify(raw, SECRET);
    // decoded = { username, role }
    if (decoded.role === "admin") {
      return "admin";                    // adminui rodys "admin"
    }
    return decoded.username || null;     // vadybininkui – jo username (dažniausiai email)
  } catch {
    // 2) Fallback – senas DEMO variantas su plain string "dev-admin-token"
    if (raw === "dev-admin-token") return "admin";
    if (raw === "dev-manager-token") return "manager@neofinance.com";
    return null;
  }
}

/* ===============================
   DEMO LOGIN
   =============================== */
router.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  if (username === "admin" && password === "admin123") {
    return res.json({
      token: "dev-admin-token",
      user: { id: 1, username: "admin", role: "admin" },
    });
  }

  if (username === "manager" && password === "manager123") {
    return res.json({
      token: "dev-manager-token",
      user: { id: 2, username: "manager", role: "manager" },
    });
  }

  return res.status(401).json({ error: "Neteisingi prisijungimo duomenys" });
});

/* ===============================
   KONTAKTŲ FORMA – /api/contact
   =============================== */
router.post("/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({
        error: "Trūksta privalomų laukų: vardas, el. paštas arba žinutė.",
      });
    }

    // Kur siųsti? Jei yra CONTACT_EMAIL – naudok jį, jei ne – MAIL_USER
    const inbox = process.env.CONTACT_EMAIL || process.env.MAIL_USER;
    if (!inbox) {
      return res.status(500).json({
        error: "Nenurodytas CONTACT_EMAIL arba MAIL_USER serveryje.",
      });
    }

    await sendContactEmail(inbox, { name, email, subject, message });

    res.json({
      ok: true,
      message: "Žinutė sėkmingai išsiųsta.",
    });
  } catch (err) {
    console.error("Kontaktų formos klaida:", err);
    res.status(500).json({
      error: "Nepavyko išsiųsti žinutės. Bandykite dar kartą.",
    });
  }
});

/* ===============================
   ADMIN / MANAGER – REZULTATAI
   =============================== */
router.get("/admin/results", (req, res) => {
  const front = process.env.FRONT_URL || "http://localhost:5173";
  const rows = db.prepare(`
    SELECT
      il.token,
      COALESCE(il.first_name || ' ' || il.last_name, '') AS client_name,
      il.personal_code,
      il.email,
      il.created_at,
      il.expires_at,
      il.used_at,
      il.status,
      COALESCE(r.score, il.score) AS score,
      COALESCE(r.rating, il.rating) AS rating,
      COALESCE(il.email_sent, 0) AS email_sent,
      il.created_by AS manager_email   -- 👈 ČIA
    FROM invite_links il
    LEFT JOIN responses r ON r.token = il.token
    ORDER BY il.created_at DESC
  `).all().map(row => ({
    ...row,
    invite_url: `${front}/q/${row.token}`,
  }));

  res.json(rows);
});

/* ===============================
   MANAGER – NAUJO KVIESTIMO SIUNTIMAS
   =============================== */
router.post("/admin/invite", async (req, res) => {
  try {
    // 🔹 Kas sugeneravo kvietimą (admin ar manager) – iš JWT arba dev tokeno
    const createdBy = getCreatedBy(req);   // 👈 NAUDOJAM HELPERĮ

    const first_name = req.body.first_name || req.body.name;
    const last_name  = req.body.last_name  || req.body.surname;
    const { personal_code, email, send_email } = req.body || {};

    // Vardas, pavardė, AK – privaloma visada
    if (!first_name || !last_name || !personal_code) {
      return res
        .status(400)
        .json({ error: "Trūksta duomenų", received: req.body });
    }
    // El. paštas privalomas tik jeigu pasirenkama siųsti el. paštu
    if (send_email && !email) {
      return res.status(400).json({
        error:
          "Nurodykite el. paštą arba nuimkite „Siųsti el. paštu?“",
      });
    }

    const token = uuidv4();
    const created_at = Date.now();
    const expires_at = created_at + 24 * 60 * 60 * 1000; // 24 val.

    const emailToStore = send_email ? email || null : null;
    const email_sent = send_email ? 1 : 0;
    const initial_status = send_email ? "Neužpildytas" : "Nesiųsta";

    db.prepare(`
      INSERT INTO invite_links
        (token, first_name, last_name, email, personal_code, created_by, created_at, expires_at, used_at, status, score, rating, email_sent)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, NULL, NULL, ?)
    `).run(
      token,
      first_name,
      last_name,
      emailToStore,
      personal_code,
      createdBy,      // 👈 čia dabar bus "admin" ARBA "manager@neofinance.com"
      created_at,
      expires_at,
      initial_status,
      email_sent
    );

    const link =
      (process.env.FRONT_URL || "http://localhost:5173") + `/q/${token}`;

    if (send_email) {
      await sendInviteEmail(email, link, { first_name, last_name });
      // jei laiškas pavyko – paliekame email_sent=1 ir statusą "Neužpildytas"
    }

    res.json({
      ok: true,
      token,
      link,
      sent_by_email: !!send_email,
      message: send_email
        ? "Kvietimas sėkmingai išsiųstas!"
        : "Nuoroda sugeneruota (el. paštu nesiųsta).",
    });
  } catch (err) {
    console.error("❌ Kvietimo siuntimo klaida:", err);
    res.status(500).json({ error: "Nepavyko išsiųsti el. laiško" });
  }
});
/* ===============================
   VIEŠA DALIS – KLIENTO FORMA
   =============================== */

// Patikrinti kvietimo nuorodą / būseną
// Patikrinti kvietimo nuorodą / būseną
router.get("/invite/:token", (req, res) => {
  const { token } = req.params;

  const row = db
    .prepare(
      `
    SELECT token, first_name, last_name, email, personal_code,
           created_at, expires_at, used_at, status
    FROM invite_links
    WHERE token = ?
  `
    )
    .get(token);

  if (!row) return res.status(404).json({ error: "Kvietimas nerastas" });

  const now = Date.now();
  const timeExpired = row.expires_at && now > row.expires_at;
  const alreadyUsed =
    !!row.used_at || String(row.status || "").toLowerCase() === "užpildytas";

  const expired = !!(timeExpired || alreadyUsed);

  res.json({
    ok: true,
    token: row.token,
    first_name: row.first_name,
    last_name: row.last_name,
    personal_code: row.personal_code,
    status: row.status,
    expires_at: row.expires_at,
    expired, // true jei laikas praėjęs ARBA jau užpildyta
  });
});

// Vieši klausimai (klientui rodome tik UI laukus)
router.get("/questions", (req, res) => {
  let qs = db
    .prepare(
      `
   SELECT id, text, order_no, min_label, max_label, important, scale_min, scale_max, direction, rf_threshold
    FROM questions
    ORDER BY COALESCE(order_no, id)
  `
    )
    .all();

  if (qs.length === 0) {
    const seed = db.transaction(() => {
      const stmt = db.prepare(`
        INSERT INTO questions (text, order_no, min_label, max_label, important, direction, weight, scale_min, scale_max, rf_threshold)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      // trys pavyzdiniai su default parametrais
      stmt.run(
        "Aš dažnai planuoju savo laiką.",
        1,
        "Visai ne",
        "Labai taip",
        0,
        "pos",
        1,
        1,
        5,
        2
      );
      stmt.run(
        "Mėgstu rizikuoti finansiniais klausimais.",
        2,
        "Visai ne",
        "Labai taip",
        1,
        "neg",
        1,
        1,
        5,
        2
      );
      stmt.run(
        "Laikausi įsipareigojimų laiku.",
        3,
        "Visai ne",
        "Labai taip",
        0,
        "pos",
        1,
        1,
        5,
        2
      );
    });
    seed();

    qs = db
      .prepare(
        `
      SELECT id, text, order_no, min_label, max_label, important, scale_min, scale_max, direction, rf_threshold
      FROM questions
      ORDER BY COALESCE(order_no, id)
    `
      )
      .all();
  }

  res.json(qs);
});

// Atsakymų pateikimas ir balo/rating apskaičiavimas
// Atsakymų pateikimas ir balo/rating apskaičiavimas
router.post("/submit", (req, res) => {
  const { token, answers } = req.body || {};
  if (!token || !Array.isArray(answers)) {
    return res
      .status(400)
      .json({ error: "Trūksta duomenų: token/answers" });
  }

  const invite = db
    .prepare(
      `
    SELECT token, expires_at, status
    FROM invite_links
    WHERE token = ?
  `
    )
    .get(token);

  if (!invite) return res.status(404).json({ error: "Kvietimas nerastas" });

  const now = Date.now();

  // 🔒 jei statusas jau „Užpildytas“ – neleisti pateikti dar kartą
  if (invite.status === "Užpildytas") {
    return res
      .status(400)
      .json({ error: "Šis klausimynas jau buvo užpildytas." });
  }

  if (invite.expires_at && now > invite.expires_at) {
    return res
      .status(400)
      .json({ error: "Kvietimo galiojimo laikas pasibaigęs" });
  }

  // 2) Antrą kartą pildyti draudžiama
  if (
    invite.used_at ||
    String(invite.status || "").toLowerCase() === "užpildytas"
  ) {
    return res
      .status(400)
      .json({ error: "Šis klausimynas jau buvo užpildytas." });
  }

  // --- toliau palieki savo skaičiavimą (red flag, score, rating, tx ir t.t.) ---

  // ⬇️ Pasiimam pilną klausimo info (tekstą, labels ir t. t.)
  const qs = db
    .prepare(
      `
    SELECT
      id,
      text,
      important,
      min_label,
      max_label,
      direction,
      weight,
      scale_min,
      scale_max,
      rf_threshold
    FROM questions
  `
    )
    .all();
  const byId = new Map(qs.map((q) => [String(q.id), q]));

  let redFlag = false;
  let weightedSum = 0;
  let weightTotal = 0;

  // ⬇️ Čia kaupsim "snapshotą", kuris bus išsaugotas DB
  const storedAnswers = [];

  for (const a of answers) {
    const q = byId.get(String(a.id));
    const v = Number(a.value);
    if (Number.isNaN(v)) continue;

    // į snapshotą visada įdedam bent id + value
    const snapshotBase = {
      id: a.id,
      value: v,
    };

    if (!q) {
      // klausimas jau ištrintas? – tada bent išsaugom id + value
      storedAnswers.push(snapshotBase);
      continue;
    }

    // pilnas snapshotas (ką matysi po to modale)
    storedAnswers.push({
      ...snapshotBase,
      text: q.text,
      important: !!q.important,
      min_label: q.min_label,
      max_label: q.max_label,
      scale_min: q.scale_min,
      scale_max: q.scale_max,
      direction: q.direction,
      rf_threshold: q.rf_threshold,
    });

    const dir =
      (q.direction || "pos").toLowerCase() === "neg" ? "neg" : "pos";
    const w = typeof q.weight === "number" ? q.weight : 1;
    const min = typeof q.scale_min === "number" ? q.scale_min : 1;
    const max = typeof q.scale_max === "number" ? q.scale_max : 5;
    const thr = typeof q.rf_threshold === "number" ? q.rf_threshold : 2;

    const span = Math.max(1, max - min);

    if (q.important) {
      if (dir === "pos" && v <= thr) redFlag = true;
      if (dir === "neg" && v >= max - thr + 1) redFlag = true;
    }

    let norm = 0;
    if (dir === "pos") {
      norm = (v - min) / span;
    } else {
      norm = (max - v) / span;
    }
    norm = Math.min(1, Math.max(0, norm));

    weightedSum += norm * Math.max(0, w);
    weightTotal += Math.max(0, w);
  }

  let score = 0;
  if (weightTotal > 0) {
    score = Math.round((weightedSum / weightTotal) * 100);
  }

  let rating = "C";
  if (!redFlag) {
    if (score >= 85) rating = "A";
    else if (score >= 65) rating = "B";
    else rating = "C";
  } else {
    rating = "C";
  }

  const tx = db.transaction(() => {
    db.prepare(
      `
      INSERT OR REPLACE INTO responses (token, submitted_at, score, rating, answers_json)
      VALUES (?, ?, ?, ?, ?)
    `
    ).run(token, now, score, rating, JSON.stringify(storedAnswers)); // ⬅️ dabar saugom snapshotą

    db.prepare(
      `
      UPDATE invite_links
      SET used_at = ?, status = 'Užpildytas', score = ?, rating = ?
      WHERE token = ?
    `
    ).run(now, score, rating, token);
  });
  tx();

  res.json({ ok: true, score, rating });
});

// Vieno kvietimo (atsakymų) detalės
// Vieno kvietimo (atsakymų) detalės
// Vieno kvietimo (atsakymų) detalės
router.get("/admin/results/:token", (req, res) => {
  const { token } = req.params;

  const head = db
    .prepare(
      `
    SELECT
      il.token,
      il.first_name,
      il.last_name,
      il.email,
      il.personal_code,
      r.submitted_at,
      COALESCE(r.score, il.score) AS score,
      COALESCE(r.rating, il.rating) AS rating,
      r.answers_json
    FROM invite_links il
    LEFT JOIN responses r ON r.token = il.token
    WHERE il.token = ?
  `
    )
    .get(token);

  if (!head) return res.status(404).json({ error: "Įrašas nerastas" });

  if (!head.answers_json) {
    return res.json({
      token: head.token,
      client_name: `${head.first_name ?? ""} ${
        head.last_name ?? ""
      }`.trim(),
      email: head.email,
      personal_code: head.personal_code,
      submitted_at: head.submitted_at || null,
      score: head.score ?? null,
      rating: head.rating ?? null,
      answers: [],
    });
  }

  // ⬇️ atsarginis variantas SENIEMS įrašams (be snapshot)
  const qs = db
    .prepare(
      `
    SELECT id, text, important, min_label, max_label, scale_min, scale_max
    FROM questions
  `
    )
    .all();
  const byId = new Map(qs.map((q) => [String(q.id), q]));

  let rawAnswers = [];
  try {
    rawAnswers = JSON.parse(head.answers_json) || [];
  } catch {
    rawAnswers = [];
  }

  const answers = rawAnswers.map((a) => {
    const base = {
      id: a.id,
      value: a.value,
    };

    // ⬇️ naujas formatas (su snapshotu) – naudojam tai, kas įrašyta JSON'e
    const hasSnapshotFields =
      a && typeof a === "object" &&
      ("text" in a || "min_label" in a || "max_label" in a);

    if (hasSnapshotFields) {
      return {
        ...base,
        text: a.text ?? `Klausimas #${a.id}`,
        important: !!a.important,
        min_label: a.min_label ?? null,
        max_label: a.max_label ?? null,
        scale_min: a.scale_min ?? null,
        scale_max: a.scale_max ?? null,
      };
    }

    // ⬇️ senas formatas ({id,value}) – bandome atkurti iš dabartinės questions lentelės
    const q = byId.get(String(a.id));
    return {
      ...base,
      text: q ? q.text : `Klausimas #${a.id}`,
      important: q ? !!q.important : false,
      min_label: q?.min_label ?? null,
      max_label: q?.max_label ?? null,
      scale_min: q?.scale_min ?? null,
      scale_max: q?.scale_max ?? null,
    };
  });

  res.json({
    token: head.token,
    client_name: `${head.first_name ?? ""} ${
      head.last_name ?? ""
    }`.trim(),
    email: head.email,
    personal_code: head.personal_code,
    submitted_at: head.submitted_at || null,
    score: head.score ?? null,
    rating: head.rating ?? null,
    answers,
  });
});
/* ===============================
   ADMIN – klausimų CRUD
   =============================== */
router.get("/admin/questions", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT id, text, order_no, min_label, max_label, important,
           direction, weight, scale_min, scale_max, rf_threshold
    FROM questions
    ORDER BY COALESCE(order_no, id)
  `
    )
    .all();
  res.json(rows);
});

router.post("/admin/questions", (req, res) => {
  const {
    text,
    order_no,
    min_label,
    max_label,
    important,
    direction,
    weight,
    scale_min,
    scale_max,
    rf_threshold,
  } = req.body || {};
  if (!text) return res.status(400).json({ error: "Trūksta lauko: text" });

  const stmt = db.prepare(`
    INSERT INTO questions
      (text, order_no, min_label, max_label, important,
       direction, weight, scale_min, scale_max, rf_threshold)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const info = stmt.run(
    text,
    typeof order_no === "number" ? order_no : null,
    min_label ?? null,
    max_label ?? null,
    important ? 1 : 0,
    direction === "neg" ? "neg" : "pos",
    typeof weight === "number" ? weight : 1,
    typeof scale_min === "number" ? scale_min : 1,
    typeof scale_max === "number" ? scale_max : 5,
    typeof rf_threshold === "number" ? rf_threshold : 2
  );

  const row = db
    .prepare(
      `
    SELECT id, text, order_no, min_label, max_label, important,
           direction, weight, scale_min, scale_max, rf_threshold
    FROM questions WHERE id=?
  `
    )
    .get(info.lastInsertRowid);

  res.status(201).json(row);
});

router.put("/admin/questions/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db
    .prepare(`SELECT * FROM questions WHERE id=?`)
    .get(id);
  if (!existing)
    return res.status(404).json({ error: "Klausimas nerastas" });

  const {
    text,
    order_no,
    min_label,
    max_label,
    important,
    direction,
    weight,
    scale_min,
    scale_max,
    rf_threshold,
  } = req.body || {};

  db.prepare(
    `
    UPDATE questions
    SET text = ?,
        order_no = ?,
        min_label = ?,
        max_label = ?,
        important = ?,
        direction = ?,
        weight = ?,
        scale_min = ?,
        scale_max = ?,
        rf_threshold = ?
    WHERE id = ?
  `
  ).run(
    text ?? existing.text,
    typeof order_no === "number" ? order_no : existing.order_no,
    min_label ?? existing.min_label,
    max_label ?? existing.max_label,
    typeof important === "boolean"
      ? important
        ? 1
        : 0
      : existing.important,
    direction === "neg"
      ? "neg"
      : direction === "pos"
      ? "pos"
      : existing.direction || "pos",
    typeof weight === "number" ? weight : existing.weight ?? 1,
    typeof scale_min === "number"
      ? scale_min
      : existing.scale_min ?? 1,
    typeof scale_max === "number"
      ? scale_max
      : existing.scale_max ?? 5,
    typeof rf_threshold === "number"
      ? rf_threshold
      : existing.rf_threshold ?? 2,
    id
  );

  const row = db
    .prepare(
      `
    SELECT id, text, order_no, min_label, max_label, important,
           direction, weight, scale_min, scale_max, rf_threshold
    FROM questions WHERE id=?
  `
    )
    .get(id);

  res.json(row);
});

router.delete("/admin/questions/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = db
    .prepare(`SELECT id FROM questions WHERE id=?`)
    .get(id);
  if (!existing)
    return res.status(404).json({ error: "Klausimas nerastas" });

  db.prepare(`DELETE FROM questions WHERE id=?`).run(id);
  res.json({ ok: true });
});

router.put("/admin/questions/:id/flag", (req, res) => {
  const id = Number(req.params.id);
  const { important } = req.body || {};
  if (typeof important !== "boolean") {
    return res.status(400).json({
      error: "Trūksta/neteisingas laukas: important:boolean",
    });
  }
  const existing = db
    .prepare(`SELECT id FROM questions WHERE id=?`)
    .get(id);
  if (!existing)
    return res.status(404).json({ error: "Klausimas nerastas" });

  db.prepare(`UPDATE questions SET important=? WHERE id=?`).run(
    important ? 1 : 0,
    id
  );

  const row = db
    .prepare(
      `
    SELECT id, text, order_no, min_label, max_label, important,
           direction, weight, scale_min, scale_max, rf_threshold
    FROM questions WHERE id=?
  `
    )
    .get(id);
  res.json(row);
});

export default router;