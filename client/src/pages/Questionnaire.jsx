import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchInvite, fetchQuestions, submitAnswers } from "../api";

// paprasta offline saugykla
function savePending(token, answers) {
  const key = "pendingSubmissions";
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  // jei jau yra šitam tokenui – pakeičiam
  const filtered = arr.filter((x) => x.token !== token);
  filtered.push({ token, answers, savedAt: Date.now() });
  localStorage.setItem(key, JSON.stringify(filtered));
}
async function trySyncPending() {
  const key = "pendingSubmissions";
  const arr = JSON.parse(localStorage.getItem(key) || "[]");
  const left = [];
  for (const item of arr) {
    try {
      await submitAnswers(item.token, item.answers);
      // sėkmingai išsiųsta – nieko
    } catch {
      left.push(item); // liko neišsiųsta
    }
  }
  localStorage.setItem(key, JSON.stringify(left));
  return arr.length - left.length; // kiek išsiųsta
}

export default function Questionnaire() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [status, setStatus] = useState("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        await fetchInvite(token); // patikrinam galiojimą
      } catch (e) {
        setStatus("error");
        setMsg(e.message);
        return;
      }
      try {
        const q = await fetchQuestions();
        setQuestions(q);
        setStatus("ready");
      } catch (e) {
        // jei serveris neveikia – vis tiek leidžiam pildyti (offline)
        setQuestions([
          { id: 1, order_no: 1, text: "Aš kruopščiai planuoju finansus.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 2, order_no: 2, text: "Dažnai perku impulsyviai.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 3, order_no: 3, text: "Turiu finansinį rezervą 3+ mėn.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 4, order_no: 4, text: "Esu linkęs rizikuoti dėl didesnio pelno.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 5, order_no: 5, text: "Laiku vykdau finansinius įsipareigojimus.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 6, order_no: 6, text: "Dažnai vėluoju su mokėjimais.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 7, order_no: 7, text: "Mano pajamos stabilios.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 8, order_no: 8, text: "Darau emocinius finansinius sprendimus.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 9, order_no: 9, text: "Sekiu savo išlaidas kas mėnesį.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
          { id: 10, order_no: 10, text: "Esu linkęs skolintis be plano.", min_label: "Visiškai nesutinku", max_label: "Visiškai sutinku" },
        ]);
        setStatus("ready");
        setMsg("Serveris laikinai nepasiekiamas. Galite pildyti offline — atsakymai bus išsiųsti, kai ryšys atsistatys.");
      }
    })();
  }, [token]);

  function handleChange(id, value) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const payload = Object.entries(answers).map(([id, value]) => ({
      questionId: Number(id),
      value: Number(value),
    }));
    // bandome siųsti
    try {
      await submitAnswers(token, payload);
      navigate("/done");
    } catch {
      // offline – išsaugom ir pranešam
      savePending(token, payload);
      setMsg("Atsakymai išsaugoti įrenginyje. Kai serveris bus pasiekiamas, jie bus automatiškai nusiųsti.");
      navigate("/done");
    }
  }

  useEffect(() => {
    // pabandome sinchronizuoti, jei yra ką
    (async () => {
      const sent = await trySyncPending();
      if (sent > 0) {
        console.log(`Išsiųsta laukiantių atsakymų: ${sent}`);
      }
    })();
  }, []);

  if (status === "loading") return <p>Kraunama...</p>;
  if (status === "error") return <p style={{ color: "red" }}>{msg || "Nuoroda negaliojanti"}</p>;

  return (
    <div style={{ maxWidth: 800, margin: "0 auto" }}>
      <h3>Kredito rizikos klausimynas</h3>
      {msg && <p style={{ color: "#c77" }}>{msg}</p>}
      <form onSubmit={handleSubmit}>
        {questions.map((q) => (
          <div key={q.id} style={{ padding: "10px 0", borderBottom: "1px solid #ddd" }}>
            <div style={{ fontWeight: 600 }}>{q.order_no}. {q.text}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ opacity: 0.7 }}>{q.min_label}</span>
              {[1,2,3,4,5].map((v) => (
                <label key={v}>
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={v}
                    checked={Number(answers[q.id]) === v}
                    onChange={() => handleChange(q.id, v)}
                    required
                  />
                  {v}
                </label>
              ))}
              <span style={{ opacity: 0.7 }}>{q.max_label}</span>
            </div>
          </div>
        ))}
        <button type="submit" style={{ marginTop: 20 }}>
          Pateikti atsakymus
        </button>
      </form>
    </div>
  );
}

