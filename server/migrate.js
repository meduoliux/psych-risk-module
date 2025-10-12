import db from "./db.js";

console.log("🏗️ Pradedama migracija...");

try {
  db.prepare("ALTER TABLE invite_links ADD COLUMN status TEXT DEFAULT 'Neužpildytas'").run();
  console.log("✅ Pridėtas stulpelis 'status'");
} catch {
  console.log("ℹ️ Stulpelis 'status' jau egzistuoja");
}

try {
  db.prepare("ALTER TABLE invite_links ADD COLUMN score INTEGER").run();
  console.log("✅ Pridėtas stulpelis 'score'");
} catch {
  console.log("ℹ️ Stulpelis 'score' jau egzistuoja");
}

try {
  db.prepare("ALTER TABLE invite_links ADD COLUMN rating TEXT").run();
  console.log("✅ Pridėtas stulpelis 'rating'");
} catch {
  console.log("ℹ️ Stulpelis 'rating' jau egzistuoja");
}

console.log("🎉 Migracija baigta!");
