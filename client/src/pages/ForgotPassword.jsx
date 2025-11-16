// client/src/pages/ForgotPassword.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PkHeader from "../components/PkHeader";
import PkFooter from "../components/PkFooter";
import {
  requestPasswordReset,
  verifyPasswordReset,
  confirmPasswordReset,
} from "../api";
import "./Login.css";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1); // 1=email, 2=code, 3=new password, 4=done
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function handleRequest(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setInfo("Jei toks el. paštas egzistuoja sistemoje, patvirtinimo kodas išsiųstas.");
      setStep(2);
    } catch (err) {
      setError(err?.message || "Nepavyko išsiųsti kodo.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);
    try {
      await verifyPasswordReset(email, code);
      setInfo("Kodas patvirtintas. Įveskite naują slaptažodį.");
      setStep(3);
    } catch (err) {
      // rodome švarią žinutę
      setError("Neteisingas arba nebegaliojantis kodas.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError("");
    setInfo("");

    // 🔹 Frontend validacija
    if (password.length < 6) {
      setError("Slaptažodis turi būti bent 6 simbolių.");
      return;
    }

    if (password !== confirm) {
      setError("Slaptažodžiai nesutampa.");
      return;
    }

    setLoading(true);
    try {
      await confirmPasswordReset(email, code, password, confirm);

      // Sėkmės atveju – pereinam į 4 žingsnį (tik žinutė + mygtukas)
      setInfo("Slaptažodis sėkmingai atnaujintas. Galite prisijungti.");
      setPassword("");
      setConfirm("");
      setStep(4);
    } catch (err) {
      setError("Nepavyko atnaujinti slaptažodžio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pk-shell">
      <PkHeader />

      <main className="pk-main">
        <div className="pk-auth-card">
          <h1 className="pk-auth-title">Slaptažodžio atstatymas</h1>

          {/* ŽINGSNŲ „crumbai“ */}
          <div className="pk-steps" style={{ marginBottom: 16, fontSize: 13 }}>
            <span style={{ fontWeight: step === 1 ? 700 : 400 }}>1. El. paštas</span>
            <span style={{ margin: "0 8px" }}>›</span>
            <span style={{ fontWeight: step === 2 ? 700 : 400 }}>2. Patvirtinimo kodas</span>
            <span style={{ margin: "0 8px" }}>›</span>
            <span style={{ fontWeight: step >= 3 ? 700 : 400 }}>
              3. Naujas slaptažodis
            </span>
          </div>

          {/* 1 žingsnis – emailas */}
          {step === 1 && (
            <form className="pk-form" onSubmit={handleRequest}>
              <div className="pk-field">
                <input
                  className="pk-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Registruotas el. paštas"
                  required
                />
              </div>

              <div className="pk-actions">
                <button
                  className="pk-btn pk-btn--primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Siunčiama..." : "Siųsti kodą"}
                </button>

                <button
                  type="button"
                  className="pk-btn pk-btn--outline"
                  onClick={() => navigate("/login")}
                  style={{ marginLeft: 8 }}
                >
                  Grįžti į prisijungimą
                </button>
              </div>

              {info && <div className="pk-info">{info}</div>}
              {error && <div className="pk-error">{error}</div>}
            </form>
          )}

          {/* 2 žingsnis – patvirtinimo kodas */}
          {step === 2 && (
            <form className="pk-form" onSubmit={handleVerify}>
              <div className="pk-field">
                <input
                  className="pk-input"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Patvirtinimo kodas iš el. pašto"
                  required
                />
              </div>

              <div className="pk-actions pk-fp-actions">
                <button
                  className="pk-btn pk-btn--primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Tikrinama..." : "Tikrinti kodą"}
                </button>

                <button
                  type="button"
                  className="pk-btn pk-btn--outline"
                  onClick={() => setStep(1)}
                >
                  Keisti el. paštą
                </button>
              </div>

              {info && <div className="pk-info">{info}</div>}
              {error && <div className="pk-error">{error}</div>}
            </form>
          )}

          {/* 3 žingsnis – naujas slaptažodis */}
          {step === 3 && (
            <form className="pk-form" onSubmit={handleConfirm}>
              <div className="pk-field">
                <input
                  className="pk-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Naujas slaptažodis"
                  required
                />
              </div>

              <div className="pk-field">
                <input
                  className="pk-input"
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Pakartokite naują slaptažodį"
                  required
                />
              </div>

              <div className="pk-actions">
                <button
                  className="pk-btn pk-btn--primary"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? "Saugoma..." : "Išsaugoti naują slaptažodį"}
                </button>

                <button
                  type="button"
                  className="pk-btn pk-btn--outline"
                  onClick={() => navigate("/login")}
                  style={{ marginLeft: 8 }}
                >
                  Grįžti į prisijungimą
                </button>
              </div>

              {info && <div className="pk-info">{info}</div>}
              {error && <div className="pk-error">{error}</div>}
            </form>
          )}

          {/* 4 žingsnis – tik sėkmės žinutė + mygtukas */}
         {step === 4 && (
  <div className="pk-success-block">
    <div className="pk-success-icon">✓</div>

    <p className="pk-success-text">
      Slaptažodis sėkmingai atnaujintas. Galite prisijungti.
    </p>

    <button
      type="button"
      className="pk-btn pk-btn--primary"
      onClick={() => navigate("/login")}
    >
      Grįžti į prisijungimą
    </button>
  </div>
)}
        </div>
      </main>

      <PkFooter />
    </div>
  );
}