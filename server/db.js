import Database from "better-sqlite3";

const db = new Database("psych.db");

// Saugumui ir stabilumui
db.pragma("journal_mode = WAL");

// Sukuriamos visos lentelės
db.exec(`
CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no INTEGER NOT NULL,
  text TEXT NOT NULL,
  min_label TEXT DEFAULT 'Visiškai nesutinku',
  max_label TEXT DEFAULT 'Visiškai sutinku'
);

CREATE TABLE IF NOT EXISTS invite_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT UNIQUE NOT NULL,
  personal_code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE TABLE IF NOT EXISTS responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL,
  submitted_at INTEGER NOT NULL,
  score INTEGER NOT NULL,
  rating TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  FOREIGN KEY(token) REFERENCES invite_links(token)
);
`);

// Įterpiame 10 klausimų, jei dar nėra
const count = db.prepare("SELECT COUNT(*) as c FROM questions").get().c;
if (count === 0) {
  const insert = db.prepare(
    "INSERT INTO questions (order_no, text, min_label, max_label) VALUES (?, ?, ?, ?)"
  );

  const questions = [
    "Esu linkęs (-usi) priimti sprendimus spontaniškai.",
    "Dažnai ieškau aštresnių patirčių ir naujovių.",
    "Nemėgstu planuoti finansų iš anksto.",
    "Dažnai pasitikiu sėkme sprendžiant finansinius reikalus.",
    "Lengvai priimu paskolas ar įsipareigojimus.",
    "Esu kantrus (-i) kaupiant ilgalaikiams tikslams.",
    "Stengiuosi laikytis biudžeto ribų.",
    "Man svarbus finansinis saugumas.",
    "Prieš priimdamas (-a) sprendimą, įvertinu rizikas.",
    "Esu linkęs (-usi) impulsyviai pirkti."
  ];

  db.transaction(() => {
    questions.forEach((q, i) =>
      insert.run(i + 1, q, "Visiškai nesutinku", "Visiškai sutinku")
    );
  })();
}

export default db;
