// client/src/pages/Activate.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

const API = import.meta.env.VITE_API_URL || "/api";

export default function Activate() {
  const { token } = useParams();
  const nav = useNavigate();
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await fetch(`${API}/users/activate`, {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Nepavyko aktyvuoti");
      setOk(true);
      setTimeout(()=>nav("/login"), 1200);
    } catch (e) { setErr(e.message); }
  }

  return (
    <div style={{maxWidth:420, margin:"80px auto"}}>
      <h2>Susikurkite slaptažodį</h2>
      <form onSubmit={submit} style={{display:"flex", flexDirection:"column", gap:10}}>
        <input type="password" placeholder="Naujas slaptažodis" value={password} onChange={e=>setPassword(e.target.value)} required/>
        <button type="submit">Išsaugoti</button>
        {err && <p style={{color:"red"}}>{err}</p>}
        {ok && <p style={{color:"green"}}>Sukurta! Nukreipiama į prisijungimą…</p>}
      </form>
    </div>
  );
}
