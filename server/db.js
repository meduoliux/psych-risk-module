// server/db.js
import Database from "better-sqlite3";
import crypto from "node:crypto";

const db = new Database("psych.db");

/* =========================================================
   Pagalbiniai
   ========================================================= */
function ensureColumn(table, col, typeDef = "TEXT") {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  const has = cols.some((c) => c.name === col);
  if (has) return;

  let def = String(typeDef || "").trim();

  const wantsUnique = /\bunique\b/i.test(def);
  const wantsNotNull = /\bnot\s+null\b/i.test(def);

  def = def.replace(/\bunique\b/gi, "").replace(/\bnot\s+null\b/gi, "").trim();

  let defaultExpr = null;
  const m = def.match(/\bdefault\s+(.+)$/i);
  if (m) {
    defaultExpr = m[1].trim();
    def = def.replace(/\bdefault\s+(.+)$/i, "").trim();
  }

  const safeType = def || "TEXT";
  db.prepare(`ALTER TABLE ${table} ADD COLUMN ${col} ${safeType}`).run();

  if (defaultExpr) {
    db.prepare(`UPDATE ${table} SET ${col} = ${defaultExpr} WHERE ${col} IS NULL`).run();
  } else if (wantsNotNull) {
    const up = /int|real|num|double|float/i.test(safeType) ? "0" : "''";
    db.prepare(`UPDATE ${table} SET ${col} = ${up} WHERE ${col} IS NULL`).run();
  }

  if (wantsUnique) {
    db.prepare(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_${table}_${col} ON ${table}(${col})`
    ).run();
  }
}

export function hash(str) {
  return crypto.createHash("sha256").update(String(str), "utf8").digest("hex");
}

/* =========================================================
   Lentelės (saugiai)
   ========================================================= */
// Users – superset schema
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    password_hash TEXT,
    role TEXT CHECK(role IN ('admin','manager')) NOT NULL DEFAULT 'manager',
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
  )
`).run();

ensureColumn("users", "email", "TEXT UNIQUE");
ensureColumn("users", "password_hash", "TEXT");
ensureColumn("users", "is_active", "INTEGER NOT NULL DEFAULT 1");
ensureColumn("users", "created_at", "INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)");

// Prisijungimų istorija
db.prepare(`
  CREATE TABLE IF NOT EXISTS logins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    username TEXT,
    login_time INTEGER
  )
`).run();

// Klausimai
db.prepare(`
  CREATE TABLE IF NOT EXISTS questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT,
    order_no INTEGER,
    min_label TEXT,
    max_label TEXT,
    important INTEGER DEFAULT 0,
    direction TEXT,
    weight REAL,
    scale_min INTEGER,
    scale_max INTEGER,
    rf_threshold INTEGER
  )
`).run();

// Kvietimai
db.prepare(`
  CREATE TABLE IF NOT EXISTS invite_links (
    token TEXT PRIMARY KEY,
    personal_code TEXT,
    created_by INTEGER,
    created_at INTEGER,
    expires_at INTEGER,
    used_at INTEGER,
    status TEXT,
    score REAL,
    rating TEXT
  )
`).run();

ensureColumn("invite_links", "first_name", "TEXT");
ensureColumn("invite_links", "last_name", "TEXT");
ensureColumn("invite_links", "email", "TEXT");
ensureColumn("invite_links", "email_sent", "INTEGER DEFAULT 0");

try {
  db.prepare(
    `UPDATE invite_links SET status = 'Neužpildytas' WHERE status = 'Nesiųsta'`
  ).run();
} catch { /* tyliai */ }

// Atsakymai
db.prepare(`
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE,
    submitted_at INTEGER,
    score REAL,
    rating TEXT,
    answers_json TEXT
  )
`).run();

// Registracijos
db.prepare(`
  CREATE TABLE IF NOT EXISTS registrations (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending',  -- pending|approved|rejected
    created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    approved_at   INTEGER,
    approved_by   TEXT
  )
`).run();

/* 🔐 Slaptažodžio atstatymo kodai */
db.prepare(`
  CREATE TABLE IF NOT EXISTS password_resets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    used_at INTEGER
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_password_resets_email_created
  ON password_resets(email, created_at)
`).run();

/* ✅ Nauja: registracijos patvirtinimo kodai */
db.prepare(`
  CREATE TABLE IF NOT EXISTS registration_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    code_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
    verified_at INTEGER
  )
`).run();

db.prepare(`
  CREATE INDEX IF NOT EXISTS idx_registration_codes_email_created
  ON registration_codes(email, created_at)
`).run();

/* =========================================================
   Registracijų helperiai
   ========================================================= */
export function ensureRegistrationsTable() {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS registrations (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name    TEXT NOT NULL,
      last_name     TEXT NOT NULL,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'pending',
      created_at    INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000),
      approved_at   INTEGER,
      approved_by   TEXT
    )
  `).run();
}

// Papildomi laukai registracijoms – sprendimų laikas ir kas sprendė
ensureColumn("registrations", "rejected_at", "INTEGER");
ensureColumn("registrations", "rejected_by", "TEXT");
ensureColumn("registrations", "deleted_at",  "INTEGER");
ensureColumn("registrations", "deleted_by",  "TEXT");


export function createPendingRegistration({
  first_name,
  last_name,
  email,
  password_hash,
}) {
  ensureRegistrationsTable();
  return db
    .prepare(
      `
    INSERT INTO registrations (first_name, last_name, email, password_hash, status)
    VALUES (?, ?, ?, ?, 'pending')
  `
    )
    .run(first_name, last_name, email, password_hash);
}

export function listPendingRegistrations() {
  ensureRegistrationsTable();
  return db
    .prepare(
      `
    SELECT id, first_name, last_name, email, status, created_at
    FROM registrations
    WHERE status = 'pending'
    ORDER BY created_at DESC
  `
    )
    .all();
}

// 👇 NAUJA – visos registracijos visiems filtrams Admin'e
export function listRegistrations() {
  ensureRegistrationsTable();
  return db
    .prepare(
      `
      SELECT
        id,
        first_name,
        last_name,
        email,
        status,
        created_at,
        approved_at   AS approved_at_ms,
        rejected_at   AS rejected_at_ms,
        deleted_at    AS deleted_at_ms,
        approved_by,
        rejected_by,
        deleted_by
      FROM registrations
      ORDER BY created_at DESC
    `
    )
    .all();
}

export function getRegistrationById(id) {
  ensureRegistrationsTable();
  return db.prepare(`SELECT * FROM registrations WHERE id = ?`).get(id);
}

export function approveRegistration(id, approver = "admin") {
  ensureRegistrationsTable();

  const reg = db.prepare(`SELECT * FROM registrations WHERE id = ?`).get(id);
  if (!reg) throw new Error("Registracija nerasta.");

  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password TEXT,
      password_hash TEXT,
      role TEXT CHECK(role IN ('admin','manager')) NOT NULL DEFAULT 'manager',
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (strftime('%s','now')*1000)
    )
  `).run();

  const username = `${reg.first_name}.${reg.last_name}`.toLowerCase();

  const exists = db
    .prepare(`SELECT 1 FROM users WHERE email = ? OR username = ?`)
    .get(reg.email, username);
  if (!exists) {
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, is_active)
      VALUES (?, ?, ?, 'manager', 1)
    `).run(username, reg.email, reg.password_hash);
  }

  db.prepare(`
    UPDATE registrations
       SET status='approved',
           approved_at = (strftime('%s','now')*1000),
           approved_by = ?
     WHERE id = ?
  `).run(approver, id);

  return { ok: true };
}

// 👇 NAUJA – atmetimas (Atmesta)
export function rejectRegistration(id, actor = "admin") {
  ensureRegistrationsTable();
  const now = Date.now();
  db.prepare(`
    UPDATE registrations
       SET status = 'rejected',
           rejected_at = ?,
           rejected_by = ?
     WHERE id = ?
  `).run(now, actor, id);
  return { ok: true };
}

// 👇 NAUJA – „Ištrinta“ (ne fizinis DELETE, o pažymėjimas)
export function purgeRegistration(id, actor = "admin") {
  ensureRegistrationsTable();
  const now = Date.now();
  db.prepare(`
    UPDATE registrations
       SET status = 'deleted',
           deleted_at = ?,
           deleted_by = ?
     WHERE id = ?
  `).run(now, actor, id);
  return { ok: true };
}

export function deleteRegistration(id) {
  ensureRegistrationsTable();
  db.prepare(`DELETE FROM registrations WHERE id = ?`).run(id);
  return { ok: true };
}

/* =========================================================
   Slaptažodžio atstatymo helperiai
   ========================================================= */
export function createPasswordReset(email, codeHash) {
  return db
    .prepare(
      `
    INSERT INTO password_resets (email, code_hash)
    VALUES (?, ?)
  `
    )
    .run(String(email).toLowerCase(), codeHash);
}

export function findValidPasswordReset(email, codeHash, maxAgeMinutes = 30) {
  const nowMs = Date.now();
  const minCreated = nowMs - maxAgeMinutes * 60 * 1000;
  return db
    .prepare(
      `
    SELECT *
    FROM password_resets
    WHERE LOWER(email) = LOWER(?)
      AND code_hash = ?
      AND (used_at IS NULL OR used_at = 0)
      AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get(email, codeHash, minCreated);
}

export function markPasswordResetUsed(id) {
  return db
    .prepare(
      `
    UPDATE password_resets
    SET used_at = (strftime('%s','now')*1000)
    WHERE id = ?
  `
    )
    .run(id);
}

/* ✅ Nauja: registracijos patvirtinimo helperiai */
export function createRegistrationCode({
  first_name,
  last_name,
  email,
  password_hash,
  code_hash,
}) {
  return db
    .prepare(
      `
    INSERT INTO registration_codes (email, first_name, last_name, password_hash, code_hash)
    VALUES (LOWER(?), ?, ?, ?, ?)
  `
    )
    .run(email, first_name, last_name, password_hash, code_hash);
}

export function findValidRegistrationCode(
  email,
  codeHash,
  maxAgeMinutes = 30
) {
  const nowMs = Date.now();
  const minCreated = nowMs - maxAgeMinutes * 60 * 1000;
  return db
    .prepare(
      `
    SELECT *
    FROM registration_codes
    WHERE LOWER(email) = LOWER(?)
      AND code_hash = ?
      AND (verified_at IS NULL OR verified_at = 0)
      AND created_at >= ?
    ORDER BY created_at DESC
    LIMIT 1
  `
    )
    .get(email, codeHash, minCreated);
}

export function markRegistrationCodeVerified(id) {
  return db
    .prepare(
      `
    UPDATE registration_codes
    SET verified_at = (strftime('%s','now')*1000)
    WHERE id = ?
  `
    )
    .run(id);
}

/* =========================================================
   Audit (prisijungimų registras)
   ========================================================= */
export function setUserLoginAudit(username) {
  try {
    const u = db.prepare(`SELECT id FROM users WHERE username = ?`).get(username);
    db.prepare(`
      INSERT INTO logins (user_id, username, login_time)
      VALUES (?, ?, strftime('%s','now')*1000)
    `).run(u?.id ?? null, username);
  } catch { /* tyliai */ }
}

/* =========================================================
   Demo useriai (jei nėra)
   ========================================================= */
try {
  const count = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (count === 0) {
    db.prepare(`
      INSERT INTO users (username, password, password_hash, role, is_active)
      VALUES (?, ?, ?, 'admin', 1)
    `).run("admin", "admin123", hash("admin123"));
    db.prepare(`
      INSERT INTO users (username, password, password_hash, role, is_active)
      VALUES (?, ?, ?, 'manager', 1)
    `).run("manager", "manager123", hash("manager123"));
    console.log("👑 Demo: admin/admin123 ir manager/manager123");
  }
} catch { /* tyliai */ }

export default db;