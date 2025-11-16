// src/components/PkHeader.jsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./pk-header.css";

export default function PkHeader() {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Kaskart pasikeitus maršrutui – perskaitom tokeną iš localStorage
  useEffect(() => {
    const hasToken = !!localStorage.getItem("token");
    setIsLoggedIn(hasToken);
  }, [location.pathname]);

  async function handleLogout() {
    try {
      // Backend logout (nebūtina, bet tvarkingiau)
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch {
      // jei nepavyksta – tiesiog ignoruojam, svarbiausia išvalyt front'o pusę
    }

    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("username");
    } catch {
      // nieko baisaus, jei kažko nėra
    }

    setIsLoggedIn(false);
    navigate("/login");
  }

  return (
    <header className="pkh">
      <div className="pkh__inner">
        {/* Kairė: Logotipas */}
        <a href="/" className="pkh__brand" aria-label="Paskolų klubas">
          <img
            src="/paskolu-klubas-logo2.png"
            alt="Paskolų klubas"
            className="pkh__logo"
            height="40"
          />
          <span className="pkh__brand-text">PASKOLŲ KLUBAS</span>
        </a>

        {/* Dešinė: Telefonas + Prisijungimas/Atsijungti */}
        <div className="pkh__right">
          <Link to="/contacts" className="pkh__phone" aria-label="Kontaktai">
            <svg
              viewBox="0 0 24 24"
              width="22"
              height="22"
              aria-hidden="true"
              className="pkh__phone-ic"
            >
              <path
                fill="currentColor"
                d="M6.62 10.79a15.09 15.09 0 006.59 6.59l2.2-2.2a1 1 0 01.98-.26c1.07.32 2.22.5 3.41.5a1 1 0 011 1V20a1 1 0 01-1 1C10.4 21 3 13.6 3 4a1 1 0 011-1h3.59a1 1 0 011 1c0 1.19.18 2.34.5 3.41a1 1 0 01-.26.98l-2.21 2.4z"
              />
            </svg>
          </Link>

          {isLoggedIn ? (
            // Prisijungus – rodom „Atsijungti“
            <button
              type="button"
              className="pkh__login"
              onClick={handleLogout}
            >
              Atsijungti
            </button>
          ) : (
            // Neprisijungus – „Prisijungimas“
            <Link to="/login" className="pkh__login">
              Prisijungimas
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}