import React, { useEffect, useMemo, useState } from "react";
// TURI BŪTI
import { createInvite, listResults, getResultDetail } from "../api/index.js";
import "./Manager.css";

export default function Manager() {
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

  // 🔹 Žinutė po lentelės, kai nuoroda nukopijuota
  const [copyMsg, setCopyMsg] = useState("");

  // 🔹 Puslapiavimas
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
      setPage(1); // nauji duomenys → grįžtam į 1 puslapį
    } catch (e) {
      setLoadErr(e?.message || "Nepavyko užkrauti rezultatų.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadResults();
  }, []);

  // Kai keičiasi paieška – grįžtam į pirmą puslapį
  useEffect(() => {
    setPage(1);
  }, [search]);

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
      setMsg(`✅ ${res?.message || "OK"}${!res?.sent_by_email ? linkTxt : ""}`);
      setForm({
        name: "",
        surname: "",
        personal_code: "",
        email: "",
        send_email: false,
      });
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

  const filteredResults = useMemo(() => {
    if (!search) return results;
    const q = search.toLowerCase();
    return results.filter((r) =>
      (r.client_name || "").toLowerCase().includes(q) ||
      (r.email || "").toLowerCase().includes(q) ||
      (r.personal_code || "").toLowerCase().includes(q)
    );
  }, [results, search]);

  // 🔹 Pagalbinė data formatuotojas
  const formatDate = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString();
  };

  // 🔹 Puslapiavimo skaičiavimai
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / pageSize));
  const start = (page - 1) * pageSize;
  const view = filteredResults.slice(start, start + pageSize);

  // 🔹 Nuorodos kopijavimas į iškarpinę
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

    // 1) Modernus būdas
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(url)
        .then(showOk)
        .catch(() => {
          // 2) Fallback su execCommand
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
      // 2) Jei clipboard API nėra išvis
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

  // 🔹 CSV eksportas (VISI filtruoti įrašai, ne tik dabartinis puslapis)
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
  "Vadybininkas", // 👈 nauja
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
    esc(r.manager_email || r.manager_username || ""), // 👈 nauja
    esc(r.invite_url || ""),
  ].join(";")
);
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "klausimynai-manager.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // 🔹 PDF eksportas – per naršyklės Print → Save as PDF
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
          <title>Klausimynai – vadybininko eksportas</title>
          ${head}
        </head>
        <body>
          <h2>Paskolų vadybininko klausimynai</h2>
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
    <th>Vadybininkas</th> <!-- 👈 naujas -->
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

  return (
    <div className="pk-manager">
      <main className="pk-container">
        <h2 className="pk-page-title">Paskolų vadybininko panelė</h2>

        {/* ----- KVIESIMO FORMA ----- */}
        <div className="pk-card pk-mb-20">
          <h3 className="pk-card__title">Siųsti klausimyną klientui</h3>
          <form onSubmit={onSubmit}>
            <div className="pk-grid-2 pk-gap-10">
              <input
                name="name"
                placeholder="Vardas"
                value={form.name}
                onChange={onChange}
                required
                className="pk-input"
              />
              <input
                name="surname"
                placeholder="Pavardė"
                value={form.surname}
                onChange={onChange}
                required
                className="pk-input"
              />
              <input
                name="personal_code"
                placeholder="Asmens kodas"
                value={form.personal_code}
                onChange={onChange}
                required
                className="pk-input"
              />
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

            <button
              type="submit"
              disabled={sending}
              className="pk-btn pk-btn--primary pk-btn--w"
              style={{ marginTop: 10 }}
            >
              {sending
                ? "Siunčiama..."
                : form.send_email
                ? "Siųsti nuorodą el. paštu"
                : "Sugeneruoti nuorodą"}
            </button>
          </form>
          {msg && <p className="pk-msg">{msg}</p>}
        </div>

        {/* ----- REZULTATŲ LENTELĖ ----- */}
      <div className="pk-card">
  <div className="pk-row pk-row--search">
    {/* Kairė: Paieška + inputas */}
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

    {/* Dešinė: Atnaujinti + CSV + PDF */}
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
    <th className="pk-col-client">Klientas</th>
    <th className="pk-col-email">El. paštas</th>
    <th className="pk-col-code">Asmens kodas</th>
    <th className="pk-col-date">Sukurta</th>
    <th className="pk-col-date">Galioja iki</th>
    <th className="pk-col-status">Būsena</th>
    <th className="pk-col-score">Balas</th>
    <th className="pk-col-score">Reitingas</th>
    {/* 👇 naujas stulpelis */}
    <th className="pk-col-manager">Vadybininkas</th>
    <th className="pk-col-url">Nuoroda</th>
    <th className="pk-col-actions">Veiksmai</th>
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

{/* 👇 naujas stulpelis – rodome vadybininką */}
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
    title={isFilled ? "Peržiūrėti atsakymus" : "Atsakymai dar nepateikti"}
    className="pk-btn pk-btn--ghost"
    style={{ cursor: isFilled ? "pointer" : "not-allowed" }}
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

        {/* ----- DETALIŲ MODALAS ----- */}
        {detailOpen && (
          <div className="pk-modal-overlay" onClick={closeDetail}>
            <div className="pk-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pk-row">
                <h3 className="pk-card__title pk-grow">Atsakymai</h3>
                <button
                  onClick={closeDetail}
                  className="pk-btn pk-btn--ghost"
                >
                  ✕
                </button>
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
                    <div>
                      <b>Klientas:</b> {detail.client_name || "-"}
                    </div>
                    <div>
                      <b>El. paštas:</b> {detail.email || "-"}
                    </div>
                    <div>
                      <b>Asmens kodas:</b> {detail.personal_code || "-"}
                    </div>
                    <div>
                      <b>Pateikta:</b>{" "}
                      {detail.submitted_at
                        ? new Date(detail.submitted_at).toLocaleString()
                        : "-"}
                    </div>
                    <div>
                      <b>Balas/Reitingas:</b>{" "}
                      {detail.score ?? "-"} / {detail.rating ?? "-"}
                    </div>
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
                              <td>
                                {a.text} {a.important ? "⚠️" : ""}
                              </td>
                              <td>
                                <span className="pk-muted">
                                  {a.min_label || "Visiškai nesutinku"}
                                </span>
                                {" — "}
                                <strong>{String(a.value)}</strong>
                                {" — "}
                                <span className="pk-muted">
                                  {a.max_label || "Visiškai sutinku"}
                                </span>
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
      </main>
    </div>
  );
}