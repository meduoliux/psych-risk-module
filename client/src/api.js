// client/src/api/api.js
const BASE = import.meta.env.VITE_API_URL || "/api";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3001"
  : import.meta.env.VITE_API_BASE;

async function handle(res) {
  if (!res.ok) {
    let msg = "";
    try { msg = await res.text(); } catch {}
    // pabandyk paimti JSON error
    try {
      const j = JSON.parse(msg);
      if (j?.error) throw new Error(j.error);
    } catch { /* ignore */ }
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

export function apiGet(path) {
  return fetch(BASE + path, {
    headers: { "Content-Type": "application/json" },
  }).then(handle);
}

export function apiPost(path, body) {
  return fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);
}

export function apiPut(path, body) {
  return fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);
}

export function apiDelete(path) {
  return fetch(BASE + path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  }).then(handle);
}

/* =========================
   Auth
   ========================= */
export function login(username, password) {
  return apiPost("/login", { username, password });
}

/* =========================
   Kvietimai / Rezultatai
   ========================= */
export function createInvite(payload) {
  return apiPost("/admin/invite", payload);
}

export function listResults() {
  return apiGet("/admin/results");
}

export function resendInvite(token) {
  return apiPost(`/admin/invite/${encodeURIComponent(token)}/resend`, {});
}

/* Vieša dalis (klientui) */
export function fetchQuestions() {
  return apiGet("/questions");
}

export function checkInvite(token) {
  return apiGet(`/invite/${encodeURIComponent(token)}`);
}

export function submitAnswers(token, answers) {
  return apiPost(`/submit`, { token, answers });
}

export function getResults() {
  return apiGet("/admin/results");
}

export function getResultDetail(token) {
  return apiGet(`/admin/results/${encodeURIComponent(token)}`);
}

/* =========================
   Admin/Registracijos
   ========================= */
// status gali būti: "pending" | "approved" | "rejected" | undefined (visos)
export function listRegistrations(status) {
  const q = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiGet(`/admin/registrations${q}`);
}

export function approveRegistration(id) {
  return apiPost(`/admin/registrations/${id}/approve`, {});
}

// „Atmesti“ – naudojam DELETE, bet backend pažymi 'rejected'
export function rejectRegistration(id) {
  return apiDelete(`/admin/registrations/${id}`);
}

/* =========================
   Slaptažodžio atstatymas
   ========================= */
export function requestPasswordReset(email) {
  return apiPost("/auth/password-reset/request", { email });
}

export function verifyPasswordReset(email, code) {
  return apiPost("/auth/password-reset/verify", { email, code });
}

export function confirmPasswordReset(email, code, password, confirm) {
  return apiPost("/auth/password-reset/confirm", {
    email,
    code,
    password,
    confirm,
  });
}