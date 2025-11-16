// server/fix-db.js
import db from "./db.js";

function addColumnIfMissing(table, column, type, def = null) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  const exists = info.some((c) => c.name === column);
  if (exists) return false;
  const sql = `ALTER TABLE ${table} ADD COLUMN ${column} ${type}${def !== null ? ` DEFAULT ${def}` : ""}`;
  db.prepare(sql).run();
  return true;
}

function ensureInviteLinksColumns() {
  console.log("🔧 Tikrinama invite_links struktūra...");
  let changed = false;
  changed |= addColumnIfMissing("invite_links", "created_by", "INTEGER");
  changed |= addColumnIfMissing("invite_links", "first_name", "TEXT");
  changed |= addColumnIfMissing("invite_links", "last_name", "TEXT");
  changed |= addColumnIfMissing("invite_links", "email", "TEXT");
  changed |= addColumnIfMissing("invite_links", "status", "TEXT", `'Neužpildytas'`);
  changed |= addColumnIfMissing("invite_links", "score", "INTEGER");
  changed |= addColumnIfMissing("invite_links", "rating", "TEXT");
  console.log(changed ? "✅ invite_links atnaujinta." : "✅ invite_links – jokių pakeitimų nereikia.");
}

function ensureQuestionsColumns() {
  console.log("🔧 Tikrinama questions struktūra...");
  let changed = false;
  // buvę laukai
  changed |= addColumnIfMissing("questions", "order_no", "INTEGER");
  changed |= addColumnIfMissing("questions", "min_label", "TEXT", `'Visai ne'`);
  changed |= addColumnIfMissing("questions", "max_label", "TEXT", `'Labai taip'`);
  changed |= addColumnIfMissing("questions", "important", "INTEGER", 0);
  // NAUJI laukai skaičiavimui
  changed |= addColumnIfMissing("questions", "direction", "TEXT", `'pos'`);       // 'pos' ar 'neg'
  changed |= addColumnIfMissing("questions", "weight", "REAL", 1);               // svoris (>=0)
  changed |= addColumnIfMissing("questions", "scale_min", "INTEGER", 1);         // pvz. 1
  changed |= addColumnIfMissing("questions", "scale_max", "INTEGER", 5);         // pvz. 5
  changed |= addColumnIfMissing("questions", "rf_threshold", "INTEGER", 2);      // red-flag slenkstis

  console.log(changed ? "✅ questions atnaujinta." : "✅ questions – jokių pakeitimų nereikia.");
}

function ensureResponsesPK() {
  console.log("🔧 Tikrinama responses struktūra...");
  const info = db.prepare(`PRAGMA table_info(responses)`).all();
  const hasPKonToken = info.some((c) => c.name === "token" && c.pk === 1);
  if (hasPKonToken) {
    console.log("✅ responses – token jau PRIMARY KEY.");
    return;
  }
  db.transaction(() => {
    db.prepare(`
      CREATE TABLE IF NOT EXISTS responses_new(
        token TEXT PRIMARY KEY,
        submitted_at INTEGER,
        score INTEGER,
        rating TEXT,
        answers_json TEXT
      )
    `).run();
    const rows = db.prepare(`SELECT token, submitted_at, score, rating, answers_json FROM responses`).all();
    for (const r of rows) {
      db.prepare(`
        INSERT OR REPLACE INTO responses_new (token, submitted_at, score, rating, answers_json)
        VALUES (?, ?, ?, ?, ?)
      `).run(r.token, r.submitted_at, r.score, r.rating, r.answers_json);
    }
    db.prepare(`DROP TABLE responses`).run();
    db.prepare(`ALTER TABLE responses_new RENAME TO responses`).run();
  })();
  console.log("🎉 responses atnaujinta – token dabar PRIMARY KEY.");
}

function main() {
  ensureInviteLinksColumns();
  ensureQuestionsColumns();
  ensureResponsesPK();
}

main();
