// server/risk.js
// Paprasta demo logika: sumuojame 1–5 skalę ir normalizuojame į 0–100
export function computeScore(answers = []) {
  if (!Array.isArray(answers) || answers.length === 0) return 0;
  const sum = answers.reduce((acc, a) => acc + (Number(a.value) || 0), 0);
  const max = answers.length * 5;
  return Math.round((sum / max) * 100);
}

export function mapRating(score) {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  return "C";
}
