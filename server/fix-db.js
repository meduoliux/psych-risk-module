import db from "./db.js";

console.log("🔧 Tikrinama responses struktūra...");

try {
  // Gauti senos lentelės stulpelius
  const columns = db
    .prepare(`PRAGMA table_info(responses)`)
    .all()
    .map((c) => c.name);

  if (columns.length === 0) {
    console.log("⚠️ Lentelė responses nerasta, kuriame naują...");
    db.exec(`
      CREATE TABLE responses (
        token TEXT PRIMARY KEY,
        submitted_at INTEGER,
        score INTEGER,
        rating TEXT,
        answers_json TEXT
      );
    `);
    console.log("✅ Lentelė sukurta sėkmingai!");
  } else {
    console.log("✅ Lentelė rasta su stulpeliais:", columns.join(", "));

    // Sukuriam naują lentelę su PRIMARY KEY (token)
    db.transaction(() => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS responses_new AS
        SELECT * FROM responses;
      `);

      // Pridedam PRIMARY KEY (token)
      db.exec(`
        CREATE TABLE responses_temp (
          token TEXT PRIMARY KEY,
          submitted_at INTEGER,
          score INTEGER,
          rating TEXT,
          answers_json TEXT
        );
      `);

      // Tik stulpeliai, kurie egzistuoja abiejose lentelėse
      const commonCols = ["token", "submitted_at", "score", "rating", "answers_json"]
        .filter((c) => columns.includes(c));

      db.exec(`
        INSERT INTO responses_temp (${commonCols.join(", ")})
        SELECT ${commonCols.join(", ")} FROM responses;
      `);

      db.exec(`DROP TABLE responses;`);
      db.exec(`ALTER TABLE responses_temp RENAME TO responses;`);
    })();

    console.log("🎉 Lentelė responses atnaujinta, token dabar PRIMARY KEY!");
  }
} catch (err) {
  console.error("❌ Klaida:", err.message);
}
