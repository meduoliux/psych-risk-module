// client/src/pages/Contacts.jsx
import React, { useMemo, useState } from "react";
import PkHeader from "../components/PkHeader";
import PkFooter from "../components/PkFooter";

const API_BASE = import.meta.env.DEV
  ? "http://localhost:3001"
  : import.meta.env.VITE_API_BASE;
// Naudojamas tik rodymui puslapyje
const CONTACT_EMAIL = "info@paskoluklubas.lt";

export default function Contacts() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState({ ok: false, msg: "" });

  const isValid = useMemo(() => {
    return (
      form.name.trim().length > 1 &&
      /\S+@\S+\.\S+/.test(form.email) &&
      form.message.trim().length > 3
    );
  }, [form]);

  function onChange(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setStatus({ ok: false, msg: "" });
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!isValid || sending) return;
    setSending(true);
    setStatus({ ok: false, msg: "" });

    try {
      const res = await fetch(`${API_BASE}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Nepavyko išsiųsti žinutės.");
      }

      setStatus({
        ok: true,
        msg: data.message || "Žinutė sėkmingai išsiųsta. Netrukus su jumis susisieksime.",
      });

      // išvalom formą
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      setStatus({
        ok: false,
        msg: err?.message || "Įvyko klaida siunčiant žinutę.",
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="pk-shell">
      <PkHeader />

      <main className="pk-main">
        <div className="pk-container">
          <h1 className="pk-page-title" style={{ marginBottom: 12 }}>
            Kontaktai
          </h1>
          <p className="pk-muted" style={{ marginTop: 0, marginBottom: 24 }}>
            Turite klausimų ar pasiūlymų? Parašykite mums – atsakysime kuo greičiau.
          </p>

          <div className="pk-grid-2" style={{ gap: 24, alignItems: "stretch" }}>
            {/* Kontaktinės kortelės */}
            <section className="pk-card" style={{ padding: 18 }}>
              <h3 className="pk-card__title">Susisiekimo informacija</h3>

              <div className="pk-list" style={{ marginTop: 8 }}>
                <div className="pk-list-row">
  <div className="pk-list-k">Adresas:</div>
  <div className="pk-list-v">
    Ukmergės g. 126, Vilnius
  </div>
</div>
                <div className="pk-list-row">
                  <div className="pk-list-k">El. paštas:</div>
                  <div className="pk-list-v">
                    <a href={`mailto:${CONTACT_EMAIL}`} className="pk-link">
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
                <div className="pk-list-row">
                  <div className="pk-list-k">Telefonas:</div>
                  <div className="pk-list-v">
                    <a className="pk-link" href="tel:+37070055500">
                      +370 700 55500
                    </a>
                  </div>
                </div>
                <div className="pk-list-row">
                  <div className="pk-list-k">Darbo laikas</div>
                  <div className="pk-list-v">I–V 09:00–17:00</div>
                </div>
              </div>

              {/* Žemėlapis */}
              <div
                className="pk-map"
                style={{
                  marginTop: 16,
                  borderRadius: 12,
                  border: "1px solid var(--pk-border)",
                  height: 220,
                  overflow: "hidden",
                }}
              >
               <iframe
  title="Paskolų klubo biuras žemėlapyje"
  src="https://www.google.com/maps?q=Ukmerg%C4%97s+g.+126,+Vilnius&output=embed"
  style={{ border: 0, width: "100%", height: "100%" }}
  loading="lazy"
  referrerPolicy="no-referrer-when-downgrade"
                ></iframe>
              </div>
            </section>

            {/* Kontaktinė forma */}
            <section className="pk-card" style={{ padding: 18 }}>
              <h3 className="pk-card__title">Parašykite mums</h3>

              <form className="pk-form" onSubmit={onSubmit}>
                <div className="pk-field">
                  <label className="pk-label">Vardas, pavardė</label>
                  <input
                    className="pk-input"
                    name="name"
                    value={form.name}
                    onChange={onChange}
                    placeholder="Jūsų vardas ir pavardė"
                    required
                  />
                </div>

                <div className="pk-field">
                  <label className="pk-label">El. paštas</label>
                  <input
                    className="pk-input"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={onChange}
                    placeholder="jusu@pastas.lt"
                    required
                  />
                </div>

                <div className="pk-field">
                  <label className="pk-label">Tema</label>
                  <input
                    className="pk-input"
                    name="subject"
                    value={form.subject}
                    onChange={onChange}
                    placeholder="Trumpa žinutės tema"
                  />
                </div>

                <div className="pk-field">
                  <label className="pk-label">Žinutė</label>
                  <textarea
                    className="pk-input pk-input--area"
                    name="message"
                    rows={6}
                    value={form.message}
                    onChange={onChange}
                    placeholder="Kuo galime padėti?"
                    required
                  />
                </div>

                {status.msg && (
                  <div
                    className={status.ok ? "pk-msg" : "pk-error"}
                    style={{ marginTop: 6 }}
                    role={status.ok ? "status" : "alert"}
                  >
                    {status.msg}
                  </div>
                )}

                <div
                  className="pk-actions pk-actions--right"
                  style={{ marginTop: 12 }}
                >
                  <button
                    type="submit"
                    className="pk-btn pk-btn--primary"
                    disabled={sending || !isValid}
                    title={
                      !isValid
                        ? "Užpildykite privalomus laukus"
                        : "Siųsti žinutę"
                    }
                  >
                    {sending ? "Siunčiama..." : "Siųsti žinutę"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        </div>
      </main>

      <PkFooter />
    </div>
  );
}