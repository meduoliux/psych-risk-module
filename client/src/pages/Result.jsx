import React from "react";
import { Link } from "react-router-dom";

export default function Result() {
  return (
    <div style={{ textAlign: "center", marginTop: 80 }}>
      <h3>Ačiū! 🎉</h3>
      <p>Jūsų atsakymai buvo sėkmingai pateikti.</p>
      <p>Rezultatus peržiūrės administratoriaus sistema.</p>
      <Link to="/">Grįžti į pradžią</Link>
    </div>
  );
}
