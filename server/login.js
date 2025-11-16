import React, { useState } from "react";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // ✅ Tiesioginis kvietimas į backend be /api kartojimo
      const res = await fetch("http://localhost:3001/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Neteisingi duomenys");

      // 🔹 Saugom vartotojo duomenis
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      if (onLogin) onLogin(data.token);
      window.location.reload();
    } catch (err) {
      console.error("❌ Login klaida:", err);
      setError("Neteisingi prisijungimo duomenys");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "120px auto", textAlign: "center" }}>
      <h2>Prisijungimas</h2>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Vartotojo vardas"
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <div style={{ marginBottom: 12 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Slaptažodis"
            style={{ width: "100%", padding: 8 }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            padding: "10px",
            background: "#0a6cf1",
            color: "white",
            border: "none",
            cursor: "pointer",
          }}
        >
          {loading ? "Jungiama..." : "Prisijungti"}
        </button>
        {error && <p style={{ color: "red", marginTop: 10 }}>{error}</p>}
      </form>
    </div>
  );
}
