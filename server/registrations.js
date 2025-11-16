// server/registrations.js
import express from "express";
import db, { hash as dbHash } from "./db.js";
import { sendRegistrationApprovedEmail } from "./email.js";

const router = express.Router();

/* ---------- Helpers ---------- */
const nowMs = () => Date.now();

function toMs(x) {
  const n = Number(x);
  if (Number.isFinite(n) && n > 10_000) return n;
  const parsed =
    Date.parse(String(x ?? "").replace(" ", "T")) ||
    Date.parse(String(x ?? ""));
  return Number.isFinite(parsed) ? parsed : nowMs();
}

/* Ar lentelėje yra konkretus stulpelis */
function hasCol(table, col) {
  try {
    const cols = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
    return cols.includes(col);
  } catch {
    return false;
  }
}

/* Saugus helperis: sukurti user įrašą pagal tai, kokia schema pas tave yra */
function safeCreateUserFromRegistration(reg) {
  const cols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
  const hasEmail    = cols.includes("email");
  const hasHash     = cols.includes("password_hash");
  const hasIsActive = cols.includes("is_active");

  const username = `${reg.first_name}.${reg.last_name}`.toLowerCase();
  const email    = reg.email;
  const pwhash   = reg.password_hash || dbHash(reg.password || "");

  // jei toks vartotojas jau egzistuoja – nieko nedarom
  const exists = hasEmail
    ? db.prepare(`SELECT 1 FROM users WHERE email = ? OR username = ?`).get(email, username)
    : db.prepare(`SELECT 1 FROM users WHERE username = ?`).get(username);

  if (exists) return;

  if (hasEmail && hasHash && hasIsActive) {
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, 'manager', 1)
    `).run(username, email, pwhash);
  } else if (hasEmail && hasHash && !hasIsActive) {
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role)
      VALUES (?, ?, ?, 'manager')
    `).run(username, email, pwhash);
  } else if (!hasEmail && hasHash) {
    db.prepare(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, 'manager')
    `).run(username, pwhash);
  } else {
    // Labai sena schema: username/password/role
    db.prepare(`
      INSERT INTO users (username, password, role)
      VALUES (?, ?, 'manager')
    `).run(username, reg.password || "changeme123");
  }
}

/* =========================================================
   GET /api/admin/registrations?status=pending|approved|rejected|deleted
   – Grąžina registracijas pagal statusą arba visas
   ========================================================= */
router.get("/", (req, res) => {
  try {
    const status = String(req.query.status || "").toLowerCase().trim();
    const allow = ["pending", "approved", "rejected", "deleted"];

    // SELECT * – kad nereiktų rūpintis, ar yra deleted_at/deleted_by stulpeliai
    let rows;
    if (allow.includes(status)) {
      rows = db.prepare(`
        SELECT * FROM registrations
        WHERE status = ?
        ORDER BY created_at DESC
      `).all(status);
    } else {
      rows = db.prepare(`
        SELECT * FROM registrations
        ORDER BY created_at DESC
      `).all();
    }

    const normalized = rows.map(r => ({
      ...r,
      created_at_ms: r.created_at  != null ? toMs(r.created_at)  : null,
      approved_at_ms: r.approved_at != null ? toMs(r.approved_at) : null,
      rejected_at_ms: r.rejected_at != null ? toMs(r.rejected_at) : null,
      deleted_at_ms:  r.deleted_at  != null ? toMs(r.deleted_at)  : null,
    }));

    res.json({ items: normalized });
  } catch (e) {
    console.error(e);
    res.json({ items: [] });
  }
});

/* =========================================================
   POST /api/admin/registrations/:id/approve
   – Sukuria user’į (role=manager, is_active=1) ir pažymi approved
   + išsiunčia el. laišką, kad registracija patvirtinta
   ========================================================= */
router.post("/:id/approve", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reg = db.prepare(`
      SELECT * FROM registrations
      WHERE id = ?
        AND (status IS NULL OR status = 'pending')
    `).get(id); // <— PRIIMA ir NULL, ir 'pending'

    if (!reg) {
      return res.status(404).json({ error: "Įrašas nerastas arba jau apdorotas." });
    }

    // 1) Sukuriam user'į pagal esamą schemą
    safeCreateUserFromRegistration(reg);

    // 2) Atnaujinam registracijos statusą
    db.prepare(`
      UPDATE registrations
         SET status = 'approved',
             approved_at = ?,
             approved_by = ?
       WHERE id = ?
    `).run(nowMs(), "admin", id);

    // 3) Bandome išsiųsti patvirtinimo laišką (jei turime el. paštą)
    if (reg.email) {
      try {
        await sendRegistrationApprovedEmail(
          reg.email,
          reg.first_name || "",
          reg.last_name || ""
        );
      } catch (mailErr) {
        console.error("Nepavyko išsiųsti registracijos patvirtinimo laiško:", mailErr);
        // API atsakymo nekeičiam – admin UI ir toliau mato „ok: true“
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Nepavyko patvirtinti registracijos." });
  }
});

/* =========================================================
   DELETE /api/admin/registrations/:id
   – Vienas endpoint'as visiems atvejams:
     - jei PENDING: pažymim 'rejected' (+ rejected_at jei toks stulpelis yra)
     - jei APPROVED: pašalinam user'į ir pažymim 'deleted' (+ deleted_at/by jei yra)
     - jei jau REJECTED: pažymėtas lieka; (jei nori hard delete – čia nekeičiam)
     - jei jau DELETED: nieko papildomo
   ========================================================= */
router.delete("/:id", (req, res) => {
  try {
    const id = Number(req.params.id);
    const reg = db.prepare(`SELECT * FROM registrations WHERE id = ?`).get(id);
    if (!reg) {
      return res.status(404).json({ error: "Įrašas nerastas." });
    }

    const status = String(reg.status || "pending").toLowerCase();
    const hasRejectedAt = hasCol("registrations", "rejected_at");
    const hasDeletedAt  = hasCol("registrations", "deleted_at");
    const hasDeletedBy  = hasCol("registrations", "deleted_by");

    if (status === "pending") {
      // SOFT reject (kad galėtų registruotis iš naujo)
      if (hasRejectedAt) {
        db.prepare(`
          UPDATE registrations
             SET status = 'rejected',
                 rejected_at = ?
           WHERE id = ?
        `).run(nowMs(), id);
      } else {
        db.prepare(`UPDATE registrations SET status = 'rejected' WHERE id = ?`).run(id);
      }
      return res.json({ ok: true, status: "rejected" });
    }

    if (status === "approved") {
      // 1) pašalinam susietą user'į (pagal email arba username)
      const username = `${reg.first_name}.${reg.last_name}`.toLowerCase();
      const userCols = db.prepare(`PRAGMA table_info(users)`).all().map(c => c.name);
      const usersHasEmail = userCols.includes("email");

      if (usersHasEmail) {
        db.prepare(`DELETE FROM users WHERE email = ? OR username = ?`).run(reg.email, username);
      } else {
        db.prepare(`DELETE FROM users WHERE username = ?`).run(username);
      }

      // 2) pažymim registraciją kaip 'deleted'
      if (hasDeletedAt || hasDeletedBy) {
        db.prepare(`
          UPDATE registrations
             SET status = 'deleted',
                 ${hasDeletedAt ? "deleted_at = :t," : ""}
                 ${hasDeletedBy ? "deleted_by = :by," : ""}
                 approved_by = approved_by
           WHERE id = :id
        `).run({
          t: nowMs(),
          by: "admin",
          id,
        });
      } else {
        db.prepare(`UPDATE registrations SET status = 'deleted' WHERE id = ?`).run(id);
      }

      return res.json({ ok: true, status: "deleted" });
    }

    if (status === "rejected") {
      // jau atmestas – nieko daugiau nedarom (paliekam įrašą, kad matytųsi „Atmesta“
      return res.json({ ok: true, status: "rejected" });
    }

    if (status === "deleted") {
      // jau ištrintas (soft) – nieko
      return res.json({ ok: true, status: "deleted" });
    }

    // fallback: pažymim rejected
    db.prepare(`UPDATE registrations SET status = 'rejected' WHERE id = ?`).run(id);
    return res.json({ ok: true, status: "rejected" });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Nepavyko apdoroti užklausos." });
  }
});

export default router;