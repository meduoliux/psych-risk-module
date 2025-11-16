import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import PkHeader from "../components/PkHeader";
import PkFooter from "../components/PkFooter";
import "./Login.css";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3001"
  : import.meta.env.VITE_API_BASE;
const LOGIN_URL = `${API_BASE}/api/auth/login`;

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        let msg = "Neteisingi prisijungimo duomenys.";
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
          if (data?.error)   msg = data.error;
        } catch {}
        throw new Error(msg);
      }

      const data = await res.json();
      const user = data.user ?? { username: data.username, role: data.role };

      if (data?.token) localStorage.setItem("token", data.token);
      if (user)        localStorage.setItem("user", JSON.stringify(user));

      if (user?.role === "admin")       navigate("/admin");
      else if (user?.role === "manager") navigate("/manager");
      else navigate("/");
    } catch (err) {
      setError(err?.message || "Įvyko klaida.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pk-shell">
      <PkHeader />

      <main className="pk-main">
        <div className="pk-auth-card">
          <h1 className="pk-auth-title">Prisijungimas</h1>

          <form className="pk-form" onSubmit={handleSubmit}>
            <div className="pk-field">
              <input
                className="pk-input"
                type="text"
                value={username}
                onChange={(e)=>setUsername(e.target.value)}
                placeholder="Vartotojo vardas"
                required
              />
            </div>

            <div className="pk-field">
              <input
                className="pk-input"
                type="password"
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
                placeholder="Slaptažodis"
                required
              />
            </div>

            <div className="pk-actions">
              <button className="pk-btn pk-btn--primary" type="submit" disabled={loading}>
                {loading ? "Jungiama..." : "Prisijungti"}
              </button>

              <span className="pk-sep">arba</span>

              <button
                type="button"
                className="pk-btn pk-btn--outline"
                onClick={() => navigate("/register")}
              >
                Registruotis
              </button>
            </div>

            <div className="pk-auth__footer">
              <a className="pk-link" href="/forgot-password">Pamiršai slaptažodį?</a>
            </div>

            {error && <div className="pk-error">{error}</div>}
          </form>
        </div>
      </main>

      <PkFooter />
    </div>
  );
}