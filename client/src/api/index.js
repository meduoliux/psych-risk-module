// client/src/api/index.js
const BASE = import.meta.env.VITE_API_URL || "/api";

function authHeaders() {
  const t = localStorage.getItem("token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function handle(res) {
  if (!res.ok) {
    let msg = "";
    try { msg = await res.text(); } catch {}
    try {
      const j = JSON.parse(msg);
      if (j && j.error) throw new Error(j.error);
    } catch (_) {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

export function apiGet(path) {
  return fetch(BASE + path, {
    headers: { "Content-Type": "application/json", ...authHeaders() },
  }).then(handle);
}

export function apiPost(path, body) {
  return fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  }).then(handle);
}

export function apiPut(path, body) {
  return fetch(BASE + path, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  }).then(handle);
}

export function apiDelete(path) {
  return fetch(BASE + path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...authHeaders() },
  }).then(handle);
}

/* ===== Auth ===== */
export function login(username, password) {
  return apiPost("/login", { username, password });
}

/* ===== Kvietimai / Rezultatai ===== */
export function createInvite(payload) {
  return apiPost("/admin/invite", payload);
}
export function listResults() {
  return apiGet("/admin/results");
}
export function resendInvite(token) {
  return apiPost(`/admin/invite/${encodeURIComponent(token)}/resend`, {});
}
export function getResultDetail(token) {
  return apiGet(`/admin/results/${encodeURIComponent(token)}`);
}

/* ===== Vieši klausimai/anketa ===== */
export function fetchQuestions() {
  return apiGet("/questions");
}
export function checkInvite(token) {
  return apiGet(`/invite/${encodeURIComponent(token)}`);
}
export function submitAnswers(token, answers) {
  return apiPost(`/submit`, { token, answers });
}

/* ===== Admin: klausimų CRUD ===== */
export function listQuestionsAdmin() {
  return apiGet("/admin/questions");
}
export function createQuestionAdmin(payload) {
  return apiPost("/admin/questions", payload);
}
export function updateQuestionAdmin(id, payload) {
  return apiPut(`/admin/questions/${id}`, payload);
}
export function deleteQuestionAdmin(id) {
  return apiDelete(`/admin/questions/${id}`);
}
export function toggleQuestionImportant(id, important) {
  return apiPut(`/admin/questions/${id}/flag`, { important });
}

/* ===== Admin: registracijos ===== */
export function listRegistrations() {
  return apiGet("/admin/registrations");
}
export function approveRegistration(id) {
  return apiPost(`/admin/registrations/${id}/approve`, {});
}
export function rejectRegistration(id) {
  return apiDelete(`/admin/registrations/${id}`);
}
export function purgeRegistration(id) {
  return apiDelete(`/admin/registrations/${id}`);
}

/* 🔐 Slaptažodžio atstatymo API (per /api/auth/...) */
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