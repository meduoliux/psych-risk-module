// client/src/pages/Survey.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchQuestions, submitAnswers, checkInvite } from "../api";
import "./Survey.css";

export default function Survey() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [inviteOk, setInviteOk] = useState(false);
  const [questions, setQuestions] = useState([]);
  // Atsakymai nenumatyti iš anksto – kol vartotojas nepasirinks, vertė bus undefined
  const [answers, setAnswers] = useState({}); // { [q.id]: number | undefined }
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Privatumo sutikimas
  const [consent, setConsent] = useState(false);

  // Validacijos klaidos – kuriems klausimams trūksta pažymėto atsakymo
  const [errors, setErrors] = useState({}); // { [q.id]: true }

  // Pirmo klaidos elemento nuoroda, kad nuslinktume iki jo
  const firstErrorRef = useRef(null);

  useEffect(() => {
  let mounted = true;
  (async () => {
    try {
      setLoading(true);
      setError("");
      if (!token) throw new Error("Trūksta token parametro URL'e.");

      // 🔹 1) Patikrinam kvietimo būseną
      const inviteInfo = await checkInvite(token);

      if (!mounted) return;

      // 🔒 Jei nuoroda nebegalioja (24h praėjo ARBA jau užpildyta) –
      // nekraunam klausimų, rodome tik klaidą
      if (inviteInfo.expired) {
        setInviteOk(false);
        setError(
          "Ši nuoroda nebegalioja. Klausimynas jau buvo užpildytas arba baigėsi galiojimo laikas."
        );
        setLoading(false);
        return;
      }

      // ✅ NUO ŠIOL: jei statusas „Užpildytas“ – iš karto rodome Result.jsx
      if (inviteInfo.status === "Užpildytas") {
        navigate("/result", { replace: true });
        setInviteOk(false);
        setLoading(false);
        return;
      }

      // ✅ Nuoroda galioja – galim krauti klausimus
      setInviteOk(true);

      const qs = await fetchQuestions();
      if (!mounted) return;
      setQuestions(qs);

      const initial = {};
      setAnswers(initial);
    } catch (e) {
      if (!mounted) return;
      setError(e?.message || "Nepavyko įkelti klausimyno.");
      setInviteOk(false);
    } finally {
      if (mounted) setLoading(false);
    }
  })();
  return () => {
    mounted = false;
  };
}, [token, navigate]);

  function setAnswer(id, value) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: Number(value) };
      // jei vartotojas pasirinko, nuimame klaidą šiam klausimui
      setErrors((old) => {
        if (!old[id]) return old;
        const clone = { ...old };
        delete clone[id];
        return clone;
      });
      return next;
    });
  }

  // Dinaminės skalės aibė pagal klausimą
  const scaleFor = (q) => {
    const min = typeof q.scale_min === "number" ? q.scale_min : 1;
    const max = typeof q.scale_max === "number" ? q.scale_max : 5;
    const arr = [];
    for (let v = min; v <= max; v++) arr.push(v);
    return arr;
  };

  async function onSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // 1) Patikrinam, ar visiems klausimams pažymėtas atsakymas
    const newErrors = {};
    for (const q of questions) {
      const val = answers[q.id];
      if (typeof val !== "number") {
        newErrors[q.id] = true;
      }
    }

    // 2) Patikrinam sutikimą su privatumo politika
    let consentError = "";
    if (!consent) {
      consentError = "Būtina sutikti su privatumo politika.";
    }

    if (Object.keys(newErrors).length > 0 || consentError) {
      setErrors(newErrors);
      setSubmitting(false);

      // Nuslinkti prie pirmos klaidos
      const firstErrorQid = Object.keys(newErrors)[0];
      if (firstErrorQid) {
        const el = document.getElementById(`q-card-${firstErrorQid}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          firstErrorRef.current = el;
        }
      } else if (consentError) {
        const el = document.getElementById("consent-row");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      // Parodyti bendrą klaidos pranešimą viršuje
      const msg = [
        Object.keys(newErrors).length > 0 ? "Užpildykite visus klausimus." : "",
        consentError,
      ]
        .filter(Boolean)
        .join(" ");
      if (msg) setError(msg);
      return;
    }

    try {
      const payload = questions.map((q) => ({
        id: q.id,
        value: answers[q.id],
      }));

      await submitAnswers(token, payload);

      // 🔁 Po sėkmingo pateikimo – į rezultatų puslapį,
      // replace=true, kad "Back" negrąžintų atgal į formą
      navigate("/result", { replace: true });
    } catch (e) {
      setError(e?.message || "Nepavyko pateikti atsakymų.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading)
    return (
      <div className="sv-container">
        <div className="sv-loading">Kraunama...</div>
      </div>
    );

  // Jei kvietimas negalioja (expired arba klaida) – nieko daugiau nerodom
  // Nuoroda nebegalioja / jau panaudota / pasibaigęs laikas
if (!inviteOk) {
  return (
    <div className="sv-container">
      <div
        className="sv-card"
        style={{ maxWidth: 560, margin: "40px auto", textAlign: "center" }}
      >
        {/* raudonas „!“ burbulas */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: "999px",
            margin: "0 auto 16px",
            background: "rgba(239,68,68,.12)",
            border: "1px solid rgba(239,68,68,.4)",
            color: "#ef4444",
            fontSize: 28,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          !
        </div>

        <h1 className="pk-page-title" style={{ marginBottom: 8 }}>
          Nuoroda nebegalioja
        </h1>

        <p className="pk-muted" style={{ fontSize: 15 }}>
          {error ||
            "Klausimynas jau buvo užpildytas arba baigėsi galiojimo laikas."}
        </p>

        <div
          style={{
            background: "#f9fafb",
            borderRadius: 10,
            padding: "12px 14px",
            fontSize: 14,
            color: "#4b5563",
            textAlign: "left",
          }}
        >
          <p style={{ margin: "0 0 6px" }}>
            • Jei jau užpildėte klausimyną – papildomai nieko daryti nereikia.
          </p>
          <p style={{ margin: 0 }}>
            • Jei įtariate klaidą – susisiekite su
                Paskolų klubo konsultantais telefonu +37070055500 arba el.paštu info@paskoluklubas.lt.
          </p>
        </div>
      </div>
    </div>
  );
}

  if (error && questions.length === 0)
    return (
      <div className="sv-container">
        <div className="sv-error">{error}</div>
      </div>
    );

  return (
    <div className="sv-container">
      <div className="sv-card">
        <h2 className="sv-title">Klausimynas</h2>
        <p className="sv-subtitle">
          Atsakykite pažymėdami vieną iš reikšmių kiekvienam klausimui.
        </p>

        {error && questions.length > 0 && (
          <div className="sv-alert sv-alert--error" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit}>
          {questions.length === 0 ? (
            <p>Nėra klausimų.</p>
          ) : (
            questions.map((q, idx) => {
              const scale = scaleFor(q);
              const hasError = !!errors[q.id];
              const value = answers[q.id]; // undefined kol nepasirinkta
              return (
                <div
                  key={q.id}
                  id={`q-card-${q.id}`}
                  className={`sv-qcard ${hasError ? "has-error" : ""}`}
                >
                  <div className="sv-qhead">
                    <div className="sv-qnum">{idx + 1}.</div>
                    <div className="sv-qtext">
                      {q.text}{" "}
                      {q.important ? (
                        <span
                          className="sv-flag"
                          title="Svarbus klausimas"
                        ></span>
                      ) : null}
                    </div>
                  </div>

                  <div className="sv-scale">
                    <span className="sv-scale-label sv-scale-label--left">
                      {q.min_label || "Visai ne"}
                    </span>

                    <div className="sv-scale-options">
                      {scale.map((v) => (
                        <label key={v} className="sv-scale-option">
                          <input
                            type="radio"
                            name={`q_${q.id}`}
                            value={v}
                            checked={Number(value) === v}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                          />
                          <span className="sv-scale-bullet">{v}</span>
                        </label>
                      ))}
                    </div>

                    <span className="sv-scale-label sv-scale-label--right">
                      {q.max_label || "Labai taip"}
                    </span>
                  </div>

                  {hasError && (
                    <div className="sv-field-error">Pasirinkite atsakymą.</div>
                  )}
                </div>
              );
            })
          )}

          {/* Privatumo sutikimas */}
          <div className="sv-consent" id="consent-row">
            <label className="sv-check">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                Patvirtinu, kad sutinku su{" "}
                <a href="/privacy" target="_blank" rel="noreferrer">
                  privatumo politika
                </a>
                .
              </span>
            </label>
            {!consent && (
              <div className="sv-field-error">
                Būtina sutikti su privatumo politika.
              </div>
            )}
          </div>

          <div className="sv-actions">
            <button
              type="submit"
              disabled={submitting || questions.length === 0}
              className="sv-submit"
            >
              {submitting ? "Siunčiama..." : "Pateikti atsakymus"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}