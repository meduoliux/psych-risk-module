import React from "react";

export default function LikertQuestion({ q, value, onChange }) {
  const options = [1, 2, 3, 4, 5];
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid #ddd" }}>
      <div style={{ fontWeight: 600 }}>{q.order_no}. {q.text}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ opacity: 0.7 }}>{q.min_label}</span>
        {options.map((v) => (
          <label key={v}>
            <input
              type="radio"
              name={`q_${q.id}`}
              value={v}
              checked={Number(value) === v}
              onChange={() => onChange(q.id, v)}
              required
            />
            {v}
          </label>
        ))}
        <span style={{ opacity: 0.7 }}>{q.max_label}</span>
      </div>
    </div>
  );
}
