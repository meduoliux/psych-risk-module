import React, { useEffect, useState } from "react";
import { createInvite, listResults } from "../api";

export default function Admin({ onLogout }) {
  const [personalCode, setPersonalCode] = useState("");
  const [filterCode, setFilterCode] = useState("");
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchData() {
    setError("");
    try {
      const data = await listResults();
      setLinks(data);
    } catch (err) {
      setError(err.message);
    }
  }

  const filtered = filterCode
    ? links.filter((l) => l.personal_code?.includes(filterCode))
    : links;

  async function generateLink() {
    if (!personalCode) return alert("Įveskite kliento asmens kodą!");
    setLoading(true);
    try {
      await createInvite(1440, personalCode);
      await fetchData();
      setPersonalCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1>Psichometrinis kredito rizikos modulis</h1>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Administratoriaus puslapis</h2>
        <button onClick={onLogout}>Atsijungti</button>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Sukurti naują nuorodą</h3>
        <input
          type="text"
          value={personalCode}
          onChange={(e) => setPersonalCode(e.target.value)}
          placeholder="Asmens kodas"
        />
        <button onClick={generateLink} disabled={loading} style={{ marginLeft: 8 }}>
          {loading ? "Kuriama..." : "Sugeneruoti nuorodą (24h)"}
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <h3>Filtruoti pagal asmens kodą</h3>
        <input
          value={filterCode}
          onChange={(e) => setFilterCode(e.target.value)}
          placeholder="pvz. 390..."
        />
        <button onClick={() => setFilterCode("")} style={{ marginLeft: 8 }}>
          Išvalyti
        </button>
      </div>

      <h3 style={{ marginTop: 24 }}>Visos nuorodos ir rezultatai</h3>
      {error && <p style={{ color: "red" }}>{error}</p>}

      <table width="100%" border="1" cellPadding="6" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Asmens kodas</th>
            <th>Nuoroda</th>
            <th>Būsena</th>
            <th>Balas</th>
            <th>Reitingas</th>
          </tr>
        </thead>
        <tbody>
          {filtered.length === 0 ? (
            <tr>
              <td colSpan="5" style={{ textAlign: "center", color: "#777" }}>Nėra duomenų</td>
            </tr>
          ) : (
            filtered.map((l) => {
              let status = "Neužpildytas ⏳";
              const now = Date.now();
              if (l.used_at) status = "Užpildytas ✅";
              else if (now > l.expires_at) status = "Nebegalioja ❌";

              return (
                <tr key={l.token}>
                  <td>{l.personal_code}</td>
                  <td>
                    <a href={l.url} target="_blank" rel="noreferrer">
                      {l.url}
                    </a>
                  </td>
                  <td>{status}</td>
                  <td>{l.score ?? "-"}</td>
                  <td>{l.rating ?? "-"}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
