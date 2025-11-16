// client/src/components/PkFooter.jsx
import React from "react";
import "./pk-footer.css";

export default function PkFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="pkf">
      <div className="pkf__inner">
        {/* Kairė – logotipas + aprašas */}
        <div className="pkf__col">
          <div className="pkf__brand">
            <img
              src="/paskolu-klubas-logo2.png"  /* lagamino logotipas iš public/ */
              alt="Paskolų klubas"
              className="pkf__logo"
              height={28}
            />
            <span className="pkf__brand-text">PASKOLŲ KLUBAS</span>
          </div>

          <p className="pkf__desc">Psichometrinio vertinimo modulis</p>

          <div className="pkf__contacts">
  <a className="pkf__contact" href="tel:+37070055500">
    +370 700 55 500
  </a>
  <a className="pkf__contact" href="mailto:info@paskoluklubas.lt">
    info@paskoluklubas.lt
  </a>
</div>
        </div>
      </div>

      <div className="pkf__bottom">
        <div className="pkf__bottom-inner">
          <div>© {year} Paskolų klubas. Visos teisės saugomos.</div>
          <div className="pkf__badges">
            {/* vieta ženkliukams / badge'ams jei reikės */}
          </div>
        </div>
      </div>
    </footer>
  );
}
