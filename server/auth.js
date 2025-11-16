// server/auth.js
import express from "express";
import jwt from "jsonwebtoken";
import db, {
  hash as dbHash,
  setUserLoginAudit,
  createPendingRegistration,
  createPasswordReset,
  findValidPasswordReset,
  markPasswordResetUsed,
  createRegistrationCode,
  findValidRegistrationCode,
  markRegistrationCodeVerified,
} from "./db.js";
import {
  sendPasswordResetEmail,
  sendRegistrationVerificationEmail,
} from "./email.js";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || "supersecretkey123";

const DEMO_USERS = {
  admin: { password: "admin123", role: "admin" },
  manager: { password: "manager123", role: "manager" },
};

/* =========================
   POST /api/auth/login
   ========================= */
router.post("/login", (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: "Trūksta duomenų" });
    }

    let userRow = null;
    try {
      userRow = db
        .prepare(
          `
        SELECT *
        FROM users
        WHERE (LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?))
          AND (is_active IS NULL OR is_active = 1)
      `
        )
        .get(username, username);
    } catch {
      userRow = null;
    }

    if (userRow && (userRow.password_hash || userRow.password)) {
      const ok =
        (userRow.password_hash && userRow.password_hash === dbHash(password)) ||
        (userRow.password && userRow.password === password);

      if (ok) {
        const token = jwt.sign(
          { username: userRow.username, role: userRow.role },
          SECRET,
          { expiresIn: "8h" }
        );

        try {
          setUserLoginAudit?.(userRow.username);
        } catch {}

        return res.json({
          token,
          role: userRow.role,
          username: userRow.username,
          user: { username: userRow.username, role: userRow.role },
        });
      }
    }

    const demo = DEMO_USERS[username];
    if (demo && demo.password === password) {
      const token = jwt.sign({ username, role: demo.role }, SECRET, {
        expiresIn: "8h",
      });
      try {
        setUserLoginAudit?.(username);
      } catch {}
      return res.json({
        token,
        role: demo.role,
        username,
        user: { username, role: demo.role },
      });
    }

    try {
      const reg = db
        .prepare(`SELECT status FROM registrations WHERE LOWER(email) = LOWER(?)`)
        .get(username);

      if (reg) {
        const st = String(reg.status || "pending").toLowerCase();
        if (st === "pending") {
          return res
            .status(403)
            .json({
              error:
                "Registracija pateikta. Palaukite administratoriaus patvirtinimo.",
            });
        }
        if (st === "rejected") {
          return res
            .status(403)
            .json({
              error:
                "Registracija buvo atmesta, galite registruotis pakartotinai.",
            });
        }
      }
    } catch {}

    return res.status(401).json({ error: "Neteisingi prisijungimo duomenys" });
  } catch {
    return res.status(500).json({ error: "Serverio klaida prisijungiant." });
  }
});

/* =========================
   POST /api/auth/logout
   ========================= */
router.post("/logout", (req, res) => {
  try {
    res.clearCookie?.("token", { httpOnly: true, sameSite: "lax" });
  } catch {}
  return res.json({ ok: true });
});

/* =========================
   POST /api/auth/register
   1 žingsnis – patikrinam duomenis, sugeneruojam kodą, išsiunčiam laišką
   ========================= */
router.post("/register", async (req, res) => {
  try {
    const { first_name, last_name, email, password, confirm } = req.body || {};

    if (!first_name || !last_name || !email || !password || !confirm) {
      return res.status(400).json({ error: "Užpildykite visus laukus." });
    }
    if (password !== confirm) {
      return res.status(400).json({ error: "Slaptažodžiai nesutampa." });
    }

    const fn = String(first_name).trim();
    const ln = String(last_name).trim();
    const em = String(email).trim().toLowerCase();

    const nameRe = /^[A-Za-zÀ-ž]+$/;
    if (!nameRe.test(fn) || !nameRe.test(ln)) {
      return res
        .status(400)
        .json({ error: "Vardas ir pavardė gali būti tik iš raidžių." });
    }

    const emailRe = new RegExp(
      `^${fn}\\.${ln}@neofinance\\.com$`,
      "i"
    );
    if (!emailRe.test(em)) {
      return res.status(400).json({
        error:
          "El. paštas turi būti formatu vardas.pavarde@neofinance.com.",
      });
    }

    try {
      const existsUser = db
        .prepare(`SELECT 1 FROM users WHERE LOWER(email) = LOWER(?)`)
        .get(em);
      if (existsUser) {
        return res
          .status(409)
          .json({ error: "Vartotojas jau aktyvus sistemoje." });
      }
    } catch {}

    let regRow = null;
    try {
      regRow = db
        .prepare(
          `SELECT * FROM registrations WHERE LOWER(email) = LOWER(?)`
        )
        .get(em);
    } catch {
      regRow = null;
    }

    if (regRow) {
      const st = String(regRow.status || "pending").toLowerCase();

      if (st === "pending") {
        return res.status(409).json({
          error: "Registracija jau pateikta ir laukia patvirtinimo.",
        });
      }

      if (st === "approved") {
        return res.status(409).json({
          error: "Vartotojas jau patvirtintas ir aktyvus sistemoje.",
        });
      }

      if (st === "rejected" || st === "deleted") {
        const archivedEmail = `${regRow.email}#archived#${regRow.id}`;
        try {
          db.prepare(
            `UPDATE registrations SET email = ? WHERE id = ?`
          ).run(archivedEmail, regRow.id);
        } catch (e) {
          console.error("Nepavyko archyvuoti seno registration email:", e);
          return res.status(500).json({
            error: "Nepavyko apdoroti ankstesnės registracijos istorijos.",
          });
        }
      }
    }

    const password_hash = dbHash(password);

    // ✅ Nauja: sugeneruojam patvirtinimo kodą ir išsaugom laikiną registraciją
    const plainCode = String(100000 + Math.floor(Math.random() * 900000));
    const codeHash = dbHash(plainCode);

    createRegistrationCode({
      first_name: fn,
      last_name: ln,
      email: em,
      password_hash,
      code_hash: codeHash,
    });

    await sendRegistrationVerificationEmail(em, plainCode, fn, ln);

    return res.json({
      ok: true,
      message:
        "Patvirtinimo kodas išsiųstas el. paštu. Įveskite kodą, kad patvirtintumėte registraciją.",
    });
  } catch (err) {
    console.error("Register klaida:", err);
    return res
      .status(500)
      .json({ error: "Nepavyko pateikti registracijos." });
  }
});

/* ✅ Nauja:
   POST /api/auth/register/verify
   2 žingsnis – patikrinam kodą ir tik tada sukuriam registrations įrašą
*/
router.post("/register/verify", (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res
        .status(400)
        .json({ error: "Nurodykite el. paštą ir patvirtinimo kodą." });
    }

    const em = String(email).trim().toLowerCase();
    const codeHash = dbHash(String(code).trim());

    const row = findValidRegistrationCode(em, codeHash, 30);
    if (!row) {
      return res
        .status(400)
        .json({ error: "Neteisingas arba nebegaliojantis kodas." });
    }

    // Sukuriam galutinę „pending“ registraciją – čia nieko nekeičiam admin logikoje
    createPendingRegistration({
      first_name: row.first_name,
      last_name: row.last_name,
      email: em,
      password_hash: row.password_hash,
    });

    markRegistrationCodeVerified(row.id);

    return res.json({
      ok: true,
      message:
        "Registracija patvirtinta kodu. Administratorius turi patvirtinti Jūsų paskyrą.",
    });
  } catch (err) {
    console.error("register/verify klaida:", err);
    return res.status(500).json({
      error: "Nepavyko patvirtinti registracijos kodo.",
    });
  }
});

/* =========================
   SLAPTAŽODŽIO ATSTATYMAS
   ========================= */

router.post("/password-reset/request", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      return res.status(400).json({ error: "Nurodykite el. paštą." });
    }
    const em = String(email).trim().toLowerCase();

    const user = db
      .prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`)
      .get(em);

    if (!user) {
      return res.json({
        ok: true,
        message:
          "Jei toks el. paštas sistemoje egzistuoja, išsiuntėme patvirtinimo kodą.",
      });
    }

    const plainCode = String(100000 + Math.floor(Math.random() * 900000));
    const codeHash = dbHash(plainCode);

    createPasswordReset(em, codeHash);

    await sendPasswordResetEmail(em, plainCode);

    return res.json({
      ok: true,
      message: "Patvirtinimo kodas išsiųstas el. paštu.",
    });
  } catch (err) {
    console.error("password-reset/request klaida:", err);
    return res
      .status(500)
      .json({ error: "Nepavyko išsiųsti patvirtinimo kodo." });
  }
});

router.post("/password-reset/verify", (req, res) => {
  try {
    const { email, code } = req.body || {};
    if (!email || !code) {
      return res
        .status(400)
        .json({ error: "Nurodykite el. paštą ir kodą." });
    }

    const em = String(email).trim().toLowerCase();
    const codeHash = dbHash(String(code).trim());

    const row = findValidPasswordReset(em, codeHash, 30);
    if (!row) {
      return res
        .status(400)
        .json({ error: "Neteisingas arba nebegaliojantis kodas." });
    }

    return res.json({ ok: true, message: "Kodas patvirtintas." });
  } catch (err) {
    console.error("password-reset/verify klaida:", err);
    return res
      .status(500)
      .json({ error: "Nepavyko patikrinti kodo." });
  }
});

router.post("/password-reset/confirm", (req, res) => {
  try {
    const { email, code, password, confirm } = req.body || {};
    if (!email || !code || !password || !confirm) {
      return res.status(400).json({ error: "Užpildykite visus laukus." });
    }
    if (password !== confirm) {
      return res.status(400).json({ error: "Slaptažodžiai nesutampa." });
    }
    if (String(password).length < 6) {
      return res
        .status(400)
        .json({
          error: "Slaptažodis turi būti bent 6 simbolių.",
        });
    }

    const em = String(email).trim().toLowerCase();
    const codeHash = dbHash(String(code).trim());

    const row = findValidPasswordReset(em, codeHash, 30);
    if (!row) {
      return res
        .status(400)
        .json({ error: "Neteisingas arba nebegaliojantis kodas." });
    }

    const user = db
      .prepare(`SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`)
      .get(em);
    if (!user) {
      return res.status(404).json({ error: "Vartotojas nerastas." });
    }

    const newHash = dbHash(password);

    db.prepare(
      `
      UPDATE users
         SET password_hash = ?, password = NULL
       WHERE id = ?
    `
    ).run(newHash, user.id);

    markPasswordResetUsed(row.id);

    return res.json({
      ok: true,
      message: "Slaptažodis sėkmingai atnaujintas.",
    });
  } catch (err) {
    console.error("password-reset/confirm klaida:", err);
    return res
      .status(500)
      .json({ error: "Nepavyko atnaujinti slaptažodžio." });
  }
});

export default router;