// client/src/pages/Admin.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  createInvite,
  listResults,
  getResultDetail,
  listQuestionsAdmin,
  createQuestionAdmin,
  updateQuestionAdmin,
  deleteQuestionAdmin,
  toggleQuestionImportant,
  // --- NAUJI importai iš to paties index.js ---
  listRegistrations,
  approveRegistration,
  rejectRegistration,
  purgeRegistration
} from "../api/index.js";
import "./Admin.css";

/* Palieku kaip buvo – nereikalinga logikai, bet netrukdo */
const API_BASE = import.meta.env.DEV
  ? "http://localhost:3001"
  : import.meta.env.VITE_API_BASE;

export default function Admin() {
  const [tab, setTab] = useState("invite"); // invite | questions | results | registrations

  return (
    <div className="pk-container">
      <h2 className="pk-page-title">Administratoriaus panelė</h2>

      <div className="pk-tabs">
        <button
          className={`pk-tab ${tab === "invite" ? "is-active" : ""}`}
          onClick={() => setTab("invite")}
          type="button"
        >
          Klausimyno siuntimas
        </button>
        <button
          className={`pk-tab ${tab === "questions" ? "is-active" : ""}`}
          onClick={() => setTab("questions")}
          type="button"
        >
          Klausimynas
        </button>
        <button
          className={`pk-tab ${tab === "results" ? "is-active" : ""}`}
          onClick={() => setTab("results")}
          type="button"
        >
          Rezultatai
        </button>
        <button
          className={`pk-tab ${tab === "registrations" ? "is-active" : ""}`}
          onClick={() => setTab("registrations")}
          type="button"
        >
          Registracijos
        </button>
      </div>

      {tab === "invite" && <InviteAndResults show="invite" />}
      {tab === "questions" && <QuestionEditor />}
      {tab === "results" && <ResultsDashboard />}
      {tab === "registrations" && <RegistrationsPanel />}
    </div>
  );
}

/* ============================================================
   0) REGISTRACIJŲ PANELĖ – klientinis filtravimas (su „Ištrinta“)
   ============================================================ */
function RegistrationsPanel() {
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(0);

  // "pending" | "approved" | "rejected" | "deleted"
  const [filter, setFilter] = useState("pending");

  function statusFromRow(r) {
    if (typeof r.status === "string") {
      const s = r.status.toLowerCase();
      if (s === "approved" || s === "rejected" || s === "pending" || s === "deleted") return s;
    }
    if (r.deleted_at_ms ?? r.deleted_at) return "deleted";
    if (r.rejected_at_ms ?? r.rejected_at) return "rejected";
    if (r.approved_at_ms ?? r.approved_at) return "approved";
    return "pending";
  }

  function fmtDate(v) {
    if (v === null || v === undefined || v === "") return "-";
    const d = new Date(v);
    return isNaN(d.getTime()) ? "-" : d.toLocaleString();
  }

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listRegistrations(); // visos registracijos
      const rows = Array.isArray(data?.items)
        ? data.items
        : Array.isArray(data)
        ? data
        : [];
      setAllItems(rows);
    } catch (e) {
      setErr(e?.message || "Nepavyko gauti registracijų.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const items = useMemo(() => {
    return allItems.filter((r) => statusFromRow(r) === filter);
  }, [allItems, filter]);

  async function approve(id) {
    setBusyId(id);
    try {
      await approveRegistration(id);
      await load();
    } catch (e) {
      alert(e?.message || "Nepavyko patvirtinti.");
    } finally {
      setBusyId(0);
    }
  }

  async function reject(id) {
    if (!confirm("Atmesti šią registraciją?")) return;
    setBusyId(id);
    try {
      await rejectRegistration(id); // PENDING -> REJECTED
      await load();
    } catch (e) {
      alert(e?.message || "Nepavyko atmesti.");
    } finally {
      setBusyId(0);
    }
  }

  async function purge(id) {
    if (!confirm("Ištrinti patvirtintą įrašą? Vartotojas turės registruotis iš naujo.")) return;
    setBusyId(id);
    try {
      await purgeRegistration(id); // APPROVED -> DELETED (+ delete user)
      await load();
    } catch (e) {
      alert(e?.message || "Nepavyko ištrinti.");
    } finally {
      setBusyId(0);
    }
  }

  return (
    <div className="pk-card pk-card--wide">
      <div className="pk-row">
        <h3 className="pk-card__title pk-grow">Registracijos</h3>

        <div className="pk-tabs" style={{ margin: 0 }}>
          <button
            className={`pk-tab ${filter === "pending" ? "is-active" : ""}`}
            onClick={() => setFilter("pending")}
            type="button"
          >
            Laukiama
          </button>
          <button
            className={`pk-tab ${filter === "approved" ? "is-active" : ""}`}
            onClick={() => setFilter("approved")}
            type="button"
          >
            Patvirtinta
          </button>
          <button
            className={`pk-tab ${filter === "rejected" ? "is-active" : ""}`}
            onClick={() => setFilter("rejected")}
            type="button"
          >
            Atmesta
          </button>
          <button
            className={`pk-tab ${filter === "deleted" ? "is-active" : ""}`}
            onClick={() => setFilter("deleted")}
            type="button"
          >
            Ištrinta
          </button>
        </div>

        <button className="pk-btn pk-btn--ghost pk-ml-8" onClick={load} disabled={loading}>
          Atnaujinti
        </button>
      </div>

      {loading ? (
        <p>Kraunama...</p>
      ) : err ? (
        <p className="pk-error">{err}</p>
      ) : items.length === 0 ? (
        <p className="pk-msg">Įrašų nėra.</p>
      ) : (
        <div className="pk-table-wrap">
          <table className="pk-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Vardas</th>
                <th>Pavardė</th>
                <th>El. paštas</th>
                <th>Statusas</th>
                <th>Pateikta</th>
                <th>Sprendimo data</th>
                <th>Veiksmus atliko</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const s = statusFromRow(r);

const decidedAt =
  (r.deleted_at_ms ?? r.deleted_at) ??
  (r.rejected_at_ms ?? r.rejected_at) ??
  (r.approved_at_ms ?? r.approved_at) ??
  null;

// 💡 ČIA nauja logika, kad rodytų teisingą žmogų pagal statusą
let actor = "-";
if (s === "deleted") {
  actor = r.deleted_by || "-";
} else if (s === "approved") {
  actor = r.approved_by || "-";
} else if (s === "rejected") {
  actor = r.rejected_by || "-";
}

                return (
                  <tr key={r.id}>
                    <td>{r.id}</td>
                    <td>{r.first_name}</td>
                    <td>{r.last_name}</td>
                    <td>{r.email}</td>
                    <td>{s}</td>
                    <td>{fmtDate(r.created_at_ms ?? r.created_at)}</td>
                    <td>{fmtDate(decidedAt)}</td>
                    <td>{actor}</td>
                    <td>
                      <div className="pk-actions">
                        {/* LAUKIAMA: "Patvirtinti" + "Atmesti" */}
                        {filter === "pending" && (
                          <>
                            <button
                              className="pk-btn pk-btn--primary pk-btn--equal"
                              onClick={() => approve(r.id)}
                              disabled={busyId === r.id}
                              title="Patvirtinti"
                            >
                              {busyId === r.id ? "Vykdoma..." : "Patvirtinti"}
                            </button>
                            <button
                              className="pk-btn pk-btn--danger pk-btn--equal"
                              onClick={() => reject(r.id)}
                              disabled={busyId === r.id}
                              title="Atmesti (pažymės kaip atmesta)"
                            >
                              Atmesti
                            </button>
                          </>
                        )}

                        {/* PATVIRTINTA: tik "Ištrinti" */}
                        {filter === "approved" && (
                          <button
                            className="pk-btn pk-btn--danger pk-btn--equal"
                            onClick={() => purge(r.id)}
                            disabled={busyId === r.id}
                            title="Ištrinti (pažymės kaip „Ištrinta“ ir pašalins vartotoją)"
                          >
                            Ištrinti
                          </button>
                        )}

                        {/* ATMESTA ir IŠTRINTA: be mygtukų */}
                        {(filter === "rejected" || filter === "deleted") && null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
/* ============================================================
   KVIESTIMO SIUNTIMAS + LENTELĖ (palikta kaip buvo)
   ============================================================ */
function InviteAndResults({ show = "both" }) {
  const [form, setForm] = useState({
    name: "",
    surname: "",
    personal_code: "",
    email: "",
    send_email: false,
  });
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState("");

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState("");
  const [detail, setDetail] = useState(null);

  const [search, setSearch] = useState("");

  // 👇 nauja – žinutė po lentelės, kai nukopijuota nuoroda
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => { setPage(1); }, [search]);

  const pageSize = 20;
  const [page, setPage] = useState(1);

  function onChange(e) {
    const { name, type, checked, value } = e.target;
    setForm((f) => ({ ...f, [name]: type === "checkbox" ? checked : value }));
  }

  async function loadResults() {
    try {
      setLoadErr("");
      setLoading(true);
      const data = await listResults();
      setResults(Array.isArray(data) ? data : []);
      setPage(1);
    } catch (e) {
      setLoadErr(e?.message || "Nepavyko užkrauti rezultatų.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadResults(); }, []);

  const filteredResults = useMemo(() => {
    if (!search) return results;
    const q = search.toLowerCase();
    return results.filter((r) =>
      (r.client_name || "").toLowerCase().includes(q) ||
      (r.email || "").toLowerCase().includes(q) ||
      (r.personal_code || "").toLowerCase().includes(q)
    );
  }, [results, search]);

    // 🔹 Pagalbinis datos formatuotojas (tas pats kaip Manager.jsx)
  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  // 🔹 Nuorodos kopijavimas į iškarpinę (tas pats kaip Manager.jsx)
function handleCopyLink(url) {
  if (!url) return;

  // 1) Bandome modernų būdą
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        // paprastas pranešimas – galima palikti alert arba tavo copyMsg
        alert("Nuoroda nukopijuota:\n" + url);
      })
      .catch(() => {
        // 2) Fallback – paprastas prompt
        window.prompt("Nukopijuokite nuorodą (Ctrl+C / Cmd+C):", url);
      });
  } else {
    // 3) Jeigu clipboard API visai nėra – iškart prompt
    window.prompt("Nukopijuokite nuorodą (Ctrl+C / Cmd+C):", url);
  }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(showOk)
        .catch(() => {
          try {
            const input = document.createElement("input");
            input.value = url;
            input.style.position = "fixed";
            input.style.left = "-9999px";
            document.body.appendChild(input);
            input.select();
            const ok = document.execCommand("copy");
            document.body.removeChild(input);
            if (ok) showOk();
            else showFail();
          } catch {
            showFail();
          }
        });
    } else {
      try {
        const input = document.createElement("input");
        input.value = url;
        input.style.position = "fixed";
        input.style.left = "-9999px";
        document.body.appendChild(input);
        input.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(input);
        if (ok) showOk();
        else showFail();
      } catch {
        showFail();
      }
    }
  }

  // 🔹 CSV eksportas – VISI filtruoti įrašai (kaip Manager.jsx, + „Vadybininkas“)
  function handleExportCsv() {
    const rows = filteredResults;
    if (!rows.length) {
      alert("Nėra duomenų eksportui.");
      return;
    }

    const header = [
      "Klientas",
      "El. paštas",
      "Asmens kodas",
      "Sukurta",
      "Galioja iki",
      "Būsena",
      "Balas",
      "Reitingas",
      "Vadybininkas",
      "Nuoroda",
    ];

    const esc = (val) => {
      const s = val == null ? "" : String(val);
      const needQuote =
        s.includes('"') || s.includes(";") || s.includes("\n");
      const doubled = s.replace(/"/g, '""');
      return needQuote ? `"${doubled}"` : doubled;
    };

    const lines = [];
    lines.push(header.join(";"));

    rows.forEach((r) => {
      lines.push(
        [
          esc(r.client_name || ""),
          esc(r.email || ""),
          esc(r.personal_code || ""),
          esc(formatDate(r.created_at)),
          esc(formatDate(r.expires_at)),
          esc(r.status || "Neužpildytas"),
          esc(r.score ?? ""),
          esc(r.rating ?? ""),
          esc(r.manager_email || r.manager_username || ""),
          esc(r.invite_url || ""),
        ].join(";")
      );
    });

    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "klausimynai-admin.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 🔹 PDF eksportas – per Print → Save as PDF (kaip Manager.jsx, + „Vadybininkas“)
  function handleExportPdf() {
    const rows = filteredResults;
    if (!rows.length) {
      alert("Nėra duomenų eksportui.");
      return;
    }

    const win = window.open("", "_blank");
    if (!win) {
      alert("Leiskite naršyklei atidaryti naują langą PDF generavimui.");
      return;
    }

    const head = `
      <style>
        body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; padding: 16px; color:#0f172a; }
        h2 { margin-top:0; margin-bottom:12px; }
        table { width:100%; border-collapse: collapse; font-size:12px; }
        th, td { border:1px solid #e5e7eb; padding:6px 8px; text-align:left; vertical-align:top; }
        th { background:#f8fafc; }
      </style>
    `;

    const rowsHtml = rows
      .map((r) => {
        return `
          <tr>
            <td>${(r.client_name || "").replace(/</g, "&lt;")}</td>
            <td>${(r.email || "").replace(/</g, "&lt;")}</td>
            <td>${(r.personal_code || "").replace(/</g, "&lt;")}</td>
            <td>${formatDate(r.created_at) || ""}</td>
            <td>${formatDate(r.expires_at) || ""}</td>
            <td>${(r.status || "Neužpildytas").replace(/</g, "&lt;")}</td>
            <td>${r.score ?? ""}</td>
            <td>${r.rating ?? ""}</td>
            <td>${(r.manager_email || r.manager_username || "").replace(/</g, "&lt;")}</td>
            <td>${(r.invite_url || "").replace(/</g, "&lt;")}</td>
          </tr>
        `;
      })
      .join("");

    win.document.write(`
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Klausimynai – admin eksportas</title>
          ${head}
        </head>
        <body>
          <h2>Klientų klausimynai (admin)</h2>
          <p>Eksportuota į PDF iš sistemos.</p>
          <table>
            <thead>
              <tr>
                <th>Klientas</th>
                <th>El. paštas</th>
                <th>Asmens kodas</th>
                <th>Sukurta</th>
                <th>Galioja iki</th>
                <th>Būsena</th>
                <th>Balas</th>
                <th>Reitingas</th>
                <th>Vadybininkas</th>
                <th>Nuoroda</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          <script>
            window.print();
          </script>
        </body>
      </html>
    `);
    win.document.close();
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    setSending(true);
    try {
      const payload = {
        name: form.name,
        surname: form.surname,
        personal_code: form.personal_code,
        send_email: !!form.send_email,
      };
      if (form.send_email) payload.email = form.email;

      const res = await createInvite(payload);
      const linkTxt = res?.link ? ` (${res.link})` : "";
      setMsg(` ${res?.message || "OK"}${!res?.sent_by_email ? linkTxt : ""}`);
      setForm({ name: "", surname: "", personal_code: "", email: "", send_email: false });
      loadResults();
    } catch (e) {
      setMsg("❌ Klaida: " + (e?.message || "nežinoma"));
    } finally {
      setSending(false);
    }
  }

  async function openDetail(token) {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailErr("");
    setDetail(null);
    try {
      const data = await getResultDetail(token);
      setDetail(data);
    } catch (e) {
      setDetailErr(e?.message || "Nepavyko gauti detalių.");
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setDetailOpen(false);
    setDetail(null);
  }

  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const start = (page - 1) * pageSize;
  const view = filteredResults.slice(start, start + pageSize);

  return (
    <>
      {(show === "invite" || show === "both") && (
        <div className="pk-card pk-card--dense pk-mt-16">
          <h3 className="pk-card__title">Siųsti klausimyną klientui</h3>
          <form onSubmit={onSubmit}>
            <div className="pk-grid-2">
              <input name="name" placeholder="Vardas" value={form.name} onChange={onChange} required className="pk-input" />
              <input name="surname" placeholder="Pavardė" value={form.surname} onChange={onChange} required className="pk-input" />
              <input name="personal_code" placeholder="Asmens kodas" value={form.personal_code} onChange={onChange} required className="pk-input" />
              {form.send_email && (
                <input
                  name="email"
                  type="email"
                  placeholder="El. paštas"
                  value={form.email}
                  onChange={onChange}
                  required={form.send_email}
                  className="pk-input"
                />
              )}
            </div>

            <label className="pk-check" style={{ marginTop: 10 }}>
              <input
                type="checkbox"
                name="send_email"
                checked={!!form.send_email}
                onChange={onChange}
              />
              <span>Siųsti nuorodą el. paštu?</span>
            </label>

            <button type="submit" disabled={sending} className="pk-btn pk-btn--primary pk-btn--w" style={{ marginTop: 10 }}>
              {sending ? "Siunčiama..." : (form.send_email ? "Siųsti nuorodą el. paštu" : "Sugeneruoti nuorodą")}
            </button>
          </form>
          {msg && <p className="pk-msg">{msg}</p>}
        </div>
      )}

           {(show === "results" || show === "both") && (
        <div className="pk-card">
          <div className="pk-row pk-row--search">
            {/* Kairė: paieška */}
            <div className="pk-row-left">
              <h3 className="pk-card__title pk-search-title">Paieška</h3>
              <input
                type="text"
                placeholder="Paieška (vardas, pavardė, el. paštas, AK)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pk-input pk-search-input"
              />
            </div>

            {/* Dešinė: atnaujinti + CSV + PDF */}
            <div className="pk-row-right">
              <button
                onClick={loadResults}
                disabled={loading}
                className="pk-btn pk-btn--ghost pk-refresh-btn"
              >
                Atnaujinti
              </button>

              <div className="pk-export-group">
                {/* CSV */}
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="pk-btn pk-btn--ghost pk-btn--sm pk-btn--icon"
                  title="Atsisiųsti CSV"
                >
                  <span className="pk-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <rect x="3" y="4" width="18" height="16" rx="2" ry="2"
                            fill="none" stroke="currentColor" strokeWidth="1.5" />
                      <line x1="3" y1="9" x2="21" y2="9"
                            stroke="currentColor" strokeWidth="1.5" />
                      <line x1="3" y1="14" x2="21" y2="14"
                            stroke="currentColor" strokeWidth="1.5" />
                      <line x1="9" y1="4" x2="9" y2="20"
                            stroke="currentColor" strokeWidth="1.5" />
                      <line x1="15" y1="4" x2="15" y2="20"
                            stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                  </span>
                </button>

                {/* PDF */}
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className="pk-btn pk-btn--ghost pk-btn--sm pk-btn--icon"
                  title="Atsisiųsti PDF"
                >
                  <span className="pk-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="14" height="14">
                      <path
                        d="M7 3h7l5 5v13H7V3z"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M14 3v5h5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M9 18h-1v2M8 18h1a1 1 0 010 2"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M12 20v-2h1a1 1 0 011 1v1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                      <path
                        d="M16 20v-2h1"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <p>Kraunama...</p>
          ) : loadErr ? (
            <p className="pk-error">{loadErr}</p>
          ) : filteredResults.length === 0 ? (
            <p>Įrašų nėra.</p>
          ) : (
            <>
              <div className="pk-table-wrap">
                <table className="pk-table">
                  <thead>
                    <tr>
                      <th>Klientas</th>
                      <th>El. paštas</th>
                      <th>Asmens kodas</th>
                      <th>Sukurta</th>
                      <th>Galioja iki</th>
                      <th>Būsena</th>
                      <th>Balas</th>
                      <th>Reitingas</th>
                      <th>Vadybininkas</th>
                      <th>Nuoroda</th>
                      <th>Veiksmai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.map((r) => {
                      const isFilled = (r.status || "")
                        .toLowerCase()
                        .includes("užpild");
                      return (
                        <tr key={r.token}>
                          <td>{r.client_name || "-"}</td>
                          <td>{r.email || "-"}</td>
                          <td>{r.personal_code || "-"}</td>
                          <td>{formatDate(r.created_at) || "-"}</td>
                          <td>{formatDate(r.expires_at) || "-"}</td>
                          <td>{r.status || "Neužpildytas"}</td>
                          <td>{r.score ?? "-"}</td>
                          <td>{r.rating ?? "-"}</td>

                          {/* Vadybininkas – admin arba manager el. paštas */}
                          <td>{r.manager_email || r.manager_username || "-"}</td>

                          <td className="pk-url-cell">
                            {r.invite_url ? (
                              <button
                                type="button"
                                className="pk-url-copy"
                                onClick={() => handleCopyLink(r.invite_url)}
                                title="Spauskite, kad nukopijuotumėte nuorodą"
                              >
                                {r.invite_url}
                              </button>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td>
                            <button
                              onClick={() => openDetail(r.token)}
                              disabled={!isFilled}
                              title={
                                isFilled
                                  ? "Peržiūrėti atsakymus"
                                  : "Atsakymai dar nepateikti"
                              }
                              className="pk-btn pk-btn--ghost"
                              style={{
                                cursor: isFilled ? "pointer" : "not-allowed",
                              }}
                            >
                              Peržiūrėti
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Puslapiavimas */}
              {totalPages > 1 && (
                <div className="pk-pagination">
                  <button
                    type="button"
                    className="pk-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹
                  </button>
                  <span className="pk-page-info">
                    {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    className="pk-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    ›
                  </button>
                </div>
              )}

              {copyMsg && (
                <p className="pk-msg pk-copy-msg">{copyMsg}</p>
              )}
            </>
          )}
        </div>
      )}

      {detailOpen && (
        <div className="pk-modal-overlay" onClick={closeDetail}>
          <div className="pk-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pk-row">
              <h3 className="pk-card__title pk-grow">Atsakymai</h3>
              <button onClick={closeDetail} className="pk-btn pk-btn--ghost">✕</button>
            </div>

            {detailLoading ? (
              <p>Kraunama...</p>
            ) : detailErr ? (
              <p className="pk-error">{detailErr}</p>
            ) : !detail ? (
              <p>Nėra duomenų.</p>
            ) : (
              <>
                <div className="pk-meta">
                  <div><b>Klientas:</b> {detail.client_name || "-"}</div>
                  <div><b>El. paštas:</b> {detail.email || "-"}</div>
                  <div><b>Asmens kodas:</b> {detail.personal_code || "-"}</div>
                  <div><b>Pateikta:</b> {detail.submitted_at ? new Date(detail.submitted_at).toLocaleString() : "-"}</div>
                  <div><b>Balas/Reitingas:</b> {detail.score ?? "-"} / {detail.rating ?? "-"}</div>
                </div>

                {detail.answers && detail.answers.length > 0 ? (
                  <div className="pk-table-wrap">
                    <table className="pk-table">
                      <thead>
                        <tr>
                          <th>Klausimas</th>
                          <th>Atsakymas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.answers.map((a) => (
                          <tr key={a.id}>
                            <td>{a.text} {a.important ? "⚠️" : ""}</td>
                            <td>
                              <span className="pk-muted">{a.min_label || "Visiškai nesutinku"}</span>
                              {" — "}
                              <strong>{String(a.value)}</strong>
                              {" — "}
                              <span className="pk-muted">{a.max_label || "Visiškai sutinku"}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>Atsakymų nėra.</p>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ============================================================
   KLAUSIMŲ REDAKTORIUS (pilna tavo logika)
   ============================================================ */
function QuestionEditor() {
  const empty = {
    text: "",
    order_no: "",
    min_label: "",
    max_label: "",
    important: false,
    direction: "pos",
    scale_min: 1,
    scale_max: 5,
    rf_threshold: 2,
  };

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [edit, setEdit] = useState(empty);
  const [updating, setUpdating] = useState(false);

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const data = await listQuestionsAdmin();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e?.message || "Nepavyko gauti klausimų.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function onChange(e, setter) {
    const { name, value, type, checked } = e.target;
    const v = type === "checkbox" ? checked : value;
    setter(prev => ({ ...prev, [name]: v }));
  }

  async function createQ(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    try {
      const payload = {
        text: form.text,
        order_no: form.order_no !== "" ? Number(form.order_no) : null,
        min_label: form.min_label || null,
        max_label: form.max_label || null,
        important: !!form.important,
        direction: form.direction === "neg" ? "neg" : "pos",
        scale_min: form.scale_min === "" ? 1 : Number(form.scale_min),
        scale_max: form.scale_max === "" ? 5 : Number(form.scale_max),
        rf_threshold: form.rf_threshold === "" ? 2 : Number(form.rf_threshold),
      };
      await createQuestionAdmin(payload);
      setForm(empty);
      load();
    } catch (e) {
      setErr(e?.message || "Nepavyko sukurti.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(row) {
    setEditingId(row.id);
    setEdit({
      text: row.text || "",
      order_no: row.order_no ?? "",
      min_label: row.min_label || "",
      max_label: row.max_label || "",
      important: !!row.important,
      direction: row.direction || "pos",
      scale_min: row.scale_min ?? 1,
      scale_max: row.scale_max ?? 5,
      rf_threshold: row.rf_threshold ?? 2,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEdit(empty);
  }

  async function saveEdit(id) {
    setUpdating(true);
    setErr("");
    try {
      const payload = {
        text: edit.text,
        order_no: edit.order_no !== "" ? Number(edit.order_no) : null,
        min_label: edit.min_label || null,
        max_label: edit.max_label || null,
        important: !!edit.important,
        direction: edit.direction === "neg" ? "neg" : "pos",
        scale_min: edit.scale_min === "" ? 1 : Number(edit.scale_min),
        scale_max: edit.scale_max === "" ? 5 : Number(edit.scale_max),
        rf_threshold: edit.rf_threshold === "" ? 2 : Number(edit.rf_threshold),
      };
      await updateQuestionAdmin(id, payload);
      cancelEdit();
      load();
    } catch (e) {
      setErr(e?.message || "Nepavyko atnaujinti.");
    } finally {
      setUpdating(false);
    }
  }

  async function del(id) {
    if (!confirm("Ištrinti klausimą?")) return;
    try {
      await deleteQuestionAdmin(id);
      load();
    } catch (e) {
      alert(e?.message || "Nepavyko ištrinti.");
    }
  }

  async function toggleFlag(id, current) {
    try {
      await toggleQuestionImportant(id, !current);
      load();
    } catch (e) {
      alert(e?.message || "Nepavyko perjungti red flag.");
    }
  }


  return (
  <div className="pk-card">
    <h3 className="pk-card__title">
      Klausimynas
      <span className="pk-help-wrap">
        <span className="pk-help" aria-label="Pagalba apie klausimyną">
          ?
        </span>
        <span className="pk-help-tooltip">
          <strong>Kaip veikia klausimynas?</strong><br />
          <br />
          <strong>Klausimo kryptis</strong><br />
          <em>„Didesnis geriau“ (pos)</em> – didesnis skaičius reiškia geresnį atsakymą
          (pvz. 1–5 skalėje: 1 = labai blogai, 5 = labai gerai).<br />
          <em>„Mažesnis geriau“ (neg)</em> – mažesnis skaičius reiškia geresnį atsakymą
          (pvz. 1 = labai gerai, 5 = labai blogai).<br />
          <br />
          <strong>Red flag (RF)</strong><br />
          Pažymėjus „Red flag“, klausimas laikomas rizikos klausimu. RF skaičius nurodo,
          kiek „blogiausių“ reikšmių laikomos rizikingomis:
          <ul>
            <li>
              jei kryptis yra <em>„Didesnis geriau“ (pos)</em> ir skalė 1–5, RF = 2 →
              rizikingi atsakymai yra <strong>1 ir 2</strong> (per žemi įverčiai);
            </li>
            <li>
              jei kryptis yra <em>„Mažesnis geriau“ (neg)</em> ir skalė 1–5, RF = 2 →
              rizikingi atsakymai yra <strong>4 ir 5</strong> (per aukšti įverčiai).
            </li>
          </ul>
          Sistema pati prisitaiko prie pasirinktos skalės.  
          Pvz. skalė 1–7 ir RF = 2:
          <ul>
            <li><em>pos</em> → red flag, kai atsakymas yra 1 arba 2;</li>
            <li><em>neg</em> → red flag, kai atsakymas yra 6 arba 7.</li>
          </ul>
          <strong>Bendras balas ir reitingas:</strong><br />
          Kiekvieno klausimo atsakymas paverčiamas į reikšmę nuo 0 iki 1,
          atsižvelgiant į kryptį (pos/neg) ir pasirinktą skalę. Pvz., skalėje 1–5
          atsakymas 3 (pos kryptis) tampa (3–1)/(5–1)=0.5.<br /><br />

          Normalizuoti atsakymai sudedami, padauginami iš klausimų svorių ir
          padalinami iš bendros svorių sumos. Taip gaunamas galutinis balas nuo 0 iki 100.<br /><br />

          <strong>Reitingai:</strong><br />
          A — balas ≥ 85 ir nėra red flag;<br />
          B — balas ≥ 65 ir nėra red flag;<br />
          C — balas &lt; 65 arba bent vienas red flag.<br /><br />

          Jeigu suveikia bent vienas „Red flag“, galutinis reitingas visada C,
          nepriklausomai nuo balo.
        </span>
      </span>
    </h3>

      {/* --- forma --- */}
      <form onSubmit={createQ} className="pk-form pk-form--q">
        <div className="pk-field col-12">
          <label className="pk-label">Klausimo tekstas <span className="pk-required">*</span></label>
          <input
            name="text"
            className="pk-input"
            placeholder="Įrašykite aiškų, vienareikšmį klausimą…"
            value={form.text}
            onChange={(e) => onChange(e, setForm)}
            required
          />
          <div className="pk-tip">Formuluokite teiginiu, pvz.: „Atsakingai planuoju finansus“.</div>
        </div>

        <div className="pk-field col-4">
          <label className="pk-label">Min žyma</label>
          <input
            name="min_label"
            className="pk-input"
            placeholder="pvz., Visiškai nesutinku"
            value={form.min_label}
            onChange={(e) => onChange(e, setForm)}
          />
        </div>

        <div className="pk-field col-4">
          <label className="pk-label">Max žyma</label>
          <input
            name="max_label"
            className="pk-input"
            placeholder="pvz., Visiškai sutinku"
            value={form.max_label}
            onChange={(e) => onChange(e, setForm)}
          />
        </div>

        <div className="pk-field col-4">
          <label className="pk-label">Eiliškumas</label>
          <input
            name="order_no"
            type="number"
            className="pk-input pk-input--num"
            placeholder="pvz., 1"
            value={form.order_no}
            onChange={(e) => onChange(e, setForm)}
          />
        </div>

        <div className="pk-row-grid">
          <div className="pk-field col-4">
            <label className="pk-label">Kryptis</label>
            <select
              name="direction"
              className="pk-input"
              value={form.direction}
              onChange={(e) => onChange(e, setForm)}
            >
              <option value="pos">Didesnis geriau</option>
              <option value="neg">Mažesnis geriau</option>
            </select>
            <div className="pk-tip">Nurodo, į kurią pusę „gerėja“ atsakymas.</div>
          </div>

          <div className="pk-field col-4">
            <label className="pk-label">Skalė</label>
            <div className="pk-inline-group">
              <input
                name="scale_min"
                type="number"
                className="pk-input pk-input--num"
                value={form.scale_min}
                onChange={(e) => onChange(e, setForm)}
              />
              <span className="pk-sep">—</span>
              <input
                name="scale_max"
                type="number"
                className="pk-input pk-input--num"
                value={form.scale_max}
                onChange={(e) => onChange(e, setForm)}
              />
            </div>
            <div className="pk-tip">Dažniausiai 1—5 arba 1—7.</div>
          </div>

          <div className="pk-field col-4">
            <label className="pk-label">Rizikos indikatorius</label>

            <div className="pk-flex-between">
              <label className="pk-check pk-check--block" style={{ flex: "1 1 50%" }}>
                <input
                  type="checkbox"
                  name="important"
                  checked={!!form.important}
                  onChange={(e) => onChange(e, setForm)}
                />
                <span>„Red flag“</span>
              </label>

              {form.important && (
                <div className="rf-box">
                  <input
                    name="rf_threshold"
                    type="number"
                    className="pk-input pk-input--num"
                    placeholder="RF slenkstis"
                    value={form.rf_threshold}
                    onChange={(e) => onChange(e, setForm)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-12 pk-actions pk-actions--right">
          <button type="submit" disabled={saving} className="pk-btn pk-btn--primary">
            {saving ? "Saugoma..." : "Pridėti klausimą"}
          </button>
        </div>
      </form>

      {/* --- lentelė --- */}
      {loading ? (
        <p>Kraunama...</p>
      ) : err ? (
        <p className="pk-error">{err}</p>
      ) : items.length === 0 ? (
        <p>Klausimų nėra.</p>
      ) : (
        <div className="pk-table-wrap">
          <table className="pk-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Tekstas</th>
                <th>Eiliškumas</th>
                <th>Min žyma</th>
                <th>Max žyma</th>
                <th>Red flag</th>
                <th>Kryptis</th>
                <th>Skalė</th>
                <th>RF</th>
                <th>Veiksmai</th>
              </tr>
            </thead>
            <tbody>
              {items.map((q) => (
                <tr key={q.id}>
                  <td>{q.id}</td>
                  <td>
                    <input name="text" value={q.id === null ? "" : ""} style={{ display: "none" }} readOnly />
                    {q.id === null ? null : (
                      <>
                        {editingId === q.id ? (
                          <input name="text" value={edit.text} onChange={(e) => onChange(e, setEdit)} className="pk-input" />
                        ) : q.text}
                      </>
                    )}
                  </td>
                  <td>
                    {editingId === q.id ? (
                      <input name="order_no" type="number" value={edit.order_no} onChange={(e) => onChange(e, setEdit)} className="pk-input" />
                    ) : (q.order_no ?? "-")}
                  </td>
                  <td>
                    {editingId === q.id ? (
                      <input name="min_label" value={edit.min_label} onChange={(e) => onChange(e, setEdit)} className="pk-input" />
                    ) : (q.min_label || "-")}
                  </td>
                  <td>
                    {editingId === q.id ? (
                      <input name="max_label" value={edit.max_label} onChange={(e) => onChange(e, setEdit)} className="pk-input" />
                    ) : (q.max_label || "-")}
                  </td>
                  <td>
                    <label className="pk-inline-check">
                      <input type="checkbox" checked={!!q.important} onChange={() => toggleFlag(q.id, !!q.important)} />
                      <span>{q.important ? "RED FLAG" : ""}</span>
                    </label>
                  </td>
                  <td>
                    {editingId === q.id ? (
                      <select name="direction" value={edit.direction} onChange={(e) => onChange(e, setEdit)} className="pk-input">
                        <option value="pos">Didesnis geriau</option>
                        <option value="neg">Mažesnis geriau</option>
                      </select>
                    ) : (q.direction || "pos")}
                  </td>
                  <td>
                    {editingId === q.id ? (
                      <div className="pk-grid-2 pk-gap-6">
                        <input name="scale_min" type="number" value={edit.scale_min} onChange={(e) => onChange(e, setEdit)} className="pk-input" />
                        <input name="scale_max" type="number" value={edit.scale_max} onChange={(e) => onChange(e, setEdit)} className="pk-input" />
                      </div>
                    ) : `${q.scale_min ?? 1}..${q.scale_max ?? 5}`}
                  </td>
                  <td>
                    {editingId === q.id ? (
                      <input name="rf_threshold" type="number" value={edit.rf_threshold} onChange={(e) => onChange(e, setEdit)} className="pk-input" />
                    ) : (q.rf_threshold ?? 2)}
                  </td>
                  <td>
                    {editingId === q.id ? (
                      <div className="pk-actions">
                        <button onClick={() => saveEdit(q.id)} disabled={updating} className="pk-btn pk-btn--primary pk-btn--equal" type="button">
                          {updating ? "Saugoma..." : "Išsaugoti"}
                        </button>
                        <button onClick={cancelEdit} className="pk-btn pk-btn--ghost pk-btn--equal" type="button">
                          Atšaukti
                        </button>
                      </div>
                    ) : (
                      <div className="pk-actions">
                        <button onClick={() => startEdit(q)} className="pk-btn pk-btn--ghost pk-btn--equal" type="button">
                          Redaguoti
                        </button>
                        <button onClick={() => del(q.id)} className="pk-btn pk-btn--danger pk-btn--equal" type="button">
                          Ištrinti
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SUVESTINĖ (palikta kaip buvo – grafikai + lentelė)
   ============================================================ */
function ResultsDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await listResults();
      setRows(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const completed = useMemo(
    () => rows.filter(r => r.rating && r.rating.trim() !== ""),
    [rows]
  );

  const now = Date.now();
  const byWindow = (days) => completed.filter(r => {
    const t = r.created_at ? Number(r.created_at) : null;
    return t && (now - t) <= days * 24 * 60 * 60 * 1000;
  });

  const countRatings = (arr) => {
    const base = { A: 0, B: 0, C: 0 };
    arr.forEach(r => {
      const k = String(r.rating || "").toUpperCase();
      if (k === "A" || k === "B" || k === "C") base[k] += 1;
    });
    return base;
  };

  const week  = countRatings(byWindow(7));
  const month = countRatings(byWindow(30));
  const year  = countRatings(byWindow(365));

  const maxW = Math.max(1, week.A + week.B + week.C);
  const maxM = Math.max(1, month.A + month.B + month.C);
  const maxY = Math.max(1, year.A + year.B + year.C);

  return (
    <>
      <div className="pk-card pk-card--wide">
        <div className="pk-row">
          <h3 className="pk-card__title pk-grow">Suvestinės</h3>
          <button className="pk-btn pk-btn--ghost" onClick={load} disabled={loading}>
            Atnaujinti
          </button>
        </div>

        {loading ? (
          <p>Kraunama...</p>
        ) : (
          <div className="pk-grid-3">
            <SummaryBlock title="Ši savaitė" totals={week} maxTotal={maxW} />
            <SummaryBlock title="Šis mėnuo" totals={month} maxTotal={maxM} />
            <SummaryBlock title="Šie metai" totals={year} maxTotal={maxY} />
          </div>
        )}
      </div>

      <div className="pk-space-28" />
      <InviteAndResults show="results" />
    </>
  );
}

function SummaryBlock({ title, totals, maxTotal }) {
  const fmt = (n) => n.toString();
  const width = (n) => `${Math.round((n / Math.max(1, maxTotal)) * 100)}%`;

  return (
    <div className="pk-summary">
      <div className="pk-summary__title">{title}</div>
      <div className="pk-bar-row">
        <div className="pk-bar-label">A</div>
        <div className="pk-bar"><span style={{ width: width(totals.A) }} /></div>
        <div className="pk-bar-val">{fmt(totals.A)}</div>
      </div>
      <div className="pk-bar-row">
        <div className="pk-bar-label">B</div>
        <div className="pk-bar"><span style={{ width: width(totals.B) }} /></div>
        <div className="pk-bar-val">{fmt(totals.B)}</div>
      </div>
      <div className="pk-bar-row">
        <div className="pk-bar-label">C</div>
        <div className="pk-bar"><span style={{ width: width(totals.C) }} /></div>
        <div className="pk-bar-val">{fmt(totals.C)}</div>
      </div>
    </div>
  );
}