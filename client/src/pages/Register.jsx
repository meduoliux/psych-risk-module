// client/src/pages/Register.jsx
import React, { useState } from "react";
import PkHeader from "../components/PkHeader";
import PkFooter from "../components/PkFooter";
import "./Register.css";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3001"
  : import.meta.env.VITE_API_BASE;

export default function Register() {
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [code, setCode] = useState("");

  // 1 – duomenys, 2 – patvirtinimo kodas, 3 – sėkmės ekranas
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(false);

  function resetMessages() {
    setMsg("");
    setOk(false);
  }

  // 1 žingsnis – išsiųsti kodą
  async function submitStep1(e) {
    e.preventDefault();
    resetMessages();

    const fn = String(first_name || "").trim();
    const ln = String(last_name || "").trim();
    const em = String(email || "").trim().toLowerCase();
    const pw = String(password || "");
    const cf = String(confirm || "");

    if (!fn || !ln || !em || !pw || !cf) {
      setMsg("Užpildykite visus laukus.");
      return;
    }
    if (pw !== cf) {
      setMsg("Slaptažodžiai nesutampa.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: fn,
          last_name: ln,
          email: em,
          password: pw,
          confirm: cf,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nepavyko pateikti registracijos.");

      setOk(true);
      setMsg(
        data.message ||
          "Patvirtinimo kodas išsiųstas el. paštu. Įveskite kodą, kad tęstumėte."
      );
      setStep(2);
      setCode("");
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  // 2 žingsnis – patvirtinti kodą ir sukurti registrations įrašą
  async function submitStep2(e) {
    e.preventDefault();
    resetMessages();

    const em = String(email || "").trim().toLowerCase();
    const cd = String(code || "").trim();

    if (!em || !cd) {
      setMsg("Įveskite el. paštą ir patvirtinimo kodą.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/register/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: em, code: cd }),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(
          data?.error || "Nepavyko patvirtinti registracijos kodo."
        );

      setOk(true);
      setMsg(
        data.message ||
          "Registracija patvirtinta. Administratorius turi patvirtinti Jūsų paskyrą."
      );

      // Išvalom slaptažodžius, kad neliktų formoje
      setPassword("");
      setConfirm("");

      // 👉 perėjimas į 3 žingsnį – sėkmės ekranas
      setStep(3);
    } catch (e) {
      setOk(false);
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = step === 1 ? submitStep1 : submitStep2;

  return (
    <div className="pk-shell">
      <PkHeader />
      <main className="pk-main">
        <div className="pk-container">
          <div className="pk-auth-card">
            <h1 className="pk-auth-title">Registracija</h1>

            {/* Mažas „wizard“ */}
            <div className="pk-steps">
              <span className={step === 1 ? "pk-step pk-step--active" : "pk-step"}>
                1. Registracijos duomenys
              </span>
              <span className="pk-step-sep">›</span>
              <span className={step === 2 ? "pk-step pk-step--active" : "pk-step"}>
                2. Patvirtinimo kodas
              </span>
            </div>

            {/* 3 žingsnis – jau nebe forma, o success ekranas */}
            {step === 3 ? (
              <div className="pk-success-block">
                <div className="pk-success-icon">✓</div>
                <p className="pk-success-text">
                  Registracija patvirtinta. Administratorius turi patvirtinti Jūsų paskyrą.
                </p>
                <p style={{ margin: "0 0 18px", fontSize: 14, color: "#4b5563" }}>
                  Apie patvirtinimą būsite informuoti el. paštu arba galėsite bandyti prisijungti
                  vėliau naudodami savo prisijungimo duomenis.
                </p>

                <button
                  type="button"
                  className="pk-btn pk-btn--primary"
                  onClick={() => (window.location.href = "/login")}
                >
                  Grįžti į prisijungimą
                </button>
              </div>
            ) : (
              // 1–2 žingsniai – forma (paliekam tavo logiką)
              <form className="pk-form" onSubmit={onSubmit} noValidate>
                {step === 1 && (
                  <>
                    <div className="pk-field">
                      <input
                        className="pk-input"
                        placeholder="Vardas"
                        value={first_name}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pk-field">
                      <input
                        className="pk-input"
                        placeholder="Pavardė"
                        value={last_name}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pk-field">
                      <input
                        className="pk-input"
                        type="email"
                        placeholder="vardas.pavarde@neofinance.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pk-field">
                      <input
                        className="pk-input"
                        type="password"
                        placeholder="Slaptažodis"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pk-field">
                      <input
                        className="pk-input"
                        type="password"
                        placeholder="Pakartokite slaptažodį"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      className="pk-primary-btn"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Siunčiama..." : "Siųsti patvirtinimo kodą"}
                    </button>
                  </>
                )}

                {step === 2 && (
                  <>
                    <p className="pk-register-caption">
                      Įveskite patvirtinimo kodą, kurį gavote el. paštu
                      {email && (
                        <>
                          {" "}
                          <strong>{email}</strong>
                        </>
                      )}
                      .
                    </p>

                    <div className="pk-field">
                      <input
                        className="pk-input"
                        type="text"
                        placeholder="Patvirtinimo kodas iš el. pašto"
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        required
                      />
                    </div>

                    <div className="pk-actions pk-register-actions">
                      <button
                        className="pk-btn pk-btn--primary"
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? "Tikrinama..." : "Patvirtinti registraciją"}
                      </button>
                    </div>
                  </>
                )}

                {msg && (
                  <div
                    className="pk-error"
                    style={{
                      marginTop: 10,
                      color: ok ? "#0a6cf1" : "#dc2626",
                    }}
                  >
                    {msg}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </main>
      <PkFooter />
    </div>
  );
}