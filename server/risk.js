// Paprastas rizikos balo skaičiavimo algoritmas
// Pagal 10 klausimų Likerto skalę (1–5).

// Klausimai 6,7,8,9 yra „teigiami“ (kur didesnis įvertinimas reiškia mažesnę riziką),
// todėl juos reikia invertuoti (5 → 1, 4 → 2 ir t.t.)

const POSITIVE_INDEXES = new Set([6, 7, 8, 9]);

// 🧮 Funkcija, kuri apskaičiuoja balą 0–100
export function computeScore(answers) {
  // answers: [{questionId, value, order_no}]
  const adjusted = answers.map((a) => {
    const v = Number(a.value);
    if (POSITIVE_INDEXES.has(Number(a.order_no))) {
      return 6 - v; // invertuojame teigiamus klausimus
    }
    return v;
  });

  const sum = adjusted.reduce((s, v) => s + v, 0); // suma nuo 10 iki 50
  const normalized = Math.round(((sum - 10) / (50 - 10)) * 100); // 0–100
  return Math.max(0, Math.min(100, normalized));
}

// 💬 Funkcija, kuri priskiria reitingą pagal balą
export function mapRating(score) {
  if (score >= 70) return "A"; // Patikimas
  if (score >= 40) return "B"; // Vidutinė rizika
  return "C"; // Padidinta rizika
}
