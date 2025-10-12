// Naudojame Vite ENV kintamąjį API bazei
const API_BASE = import.meta.env.VITE_API_URL || "/api";

function authHeader() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function fetchQuestions() {
  const r = await fetch(`${API_BASE}/questions`);
  if (!r.ok) throw new Error("Nepavyko gauti klausimų");
  return r.json();
}

export async function createInvite(ttlMinutes, personal_code) {
  const r = await fetch(`${API_BASE}/admin/invite`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify({ ttlMinutes, personal_code }),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Nepavyko sukurti nuorodos");
  return r.json();
}

export async function listResults() {
  const r = await fetch(`${API_BASE}/admin/results`, {
    headers: { ...authHeader() },
  });
  if (!r.ok) throw new Error("Nepavyko gauti rezultatų");
  return r.json();
}

export async function fetchInvite(token) {
  const r = await fetch(`${API_BASE}/invite/${token}`);
  if (!r.ok) throw new Error((await r.json()).error || "Nuoroda negalioja");
  return r.json();
}

export async function submitAnswers(token, answers) {
  const r = await fetch(`${API_BASE}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, answers }),
  });
  if (!r.ok) throw new Error((await r.json()).error || "Nepavyko pateikti");
  return r.json();
}
