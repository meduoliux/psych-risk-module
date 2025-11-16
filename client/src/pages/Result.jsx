// client/src/pages/Result.jsx
import React from "react";

export default function Result() {
  return (
    <div className="pk-shell">
      <main className="pk-main">
        <div className="pk-container">
          <div
            className="pk-card"
            style={{
              maxWidth: 560,
              margin: "40px auto",
              textAlign: "center",
            }}
          >
            {/* ✔ ženkliukas */}
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: "999px",
                margin: "0 auto 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(135deg, rgba(22,163,74,.08), rgba(22,163,74,.18))",
                border: "1px solid rgba(22,163,74,.4)",
                color: "#16a34a",
                fontSize: 28,
                fontWeight: 700,
              }}
              aria-hidden="true"
            >
              ✓
            </div>

            <h1
              className="pk-page-title"
              style={{ marginBottom: 8, textAlign: "center" }}
            >
              Klausimynas sėkmingai užpildytas
            </h1>

            <p
              className="pk-muted"
              style={{ marginTop: 0, marginBottom: 16, fontSize: 15 }}
            >
              Ačiū, kad skyrėte laiko atsakyti į klausimus. Jūsų atsakymai
              sėkmingai užregistruoti sistemoje.
            </p>

            <div
              style={{
                fontSize: 14,
                color: "#4b5563",
                textAlign: "left",
                background: "#f9fafb",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <p style={{ margin: "0 0 6px" }}>
                • Klausimynas sėkmingai užpildytas ir pakartotinai
                pildyti nebereikia.
              </p>
              <p style={{ margin: "0 0 6px" }}>
                • Jei turite klausimų dėl vertinimo rezultatų, susisiekite su
                Paskolų klubo konsultantais telefonu +37070055500 arba el.paštu info@paskoluklubas.lt.
              </p>
              <p style={{ margin: 0 }}>• Šį langą galite saugiai uždaryti, susisieksime su Jumis artimiausiu metu.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}