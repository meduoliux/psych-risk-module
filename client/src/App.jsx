import React, { useState } from "react";
import { Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import Admin from "./pages/Admin.jsx";
import Login from "./pages/Login.jsx";
import Questionnaire from "./pages/Questionnaire.jsx";
import Result from "./pages/Result.jsx";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(!!localStorage.getItem("token"));
  const navigate = useNavigate();

  function handleLogin() {
    setLoggedIn(true);
    navigate("/admin"); // 👈 iškart po prisijungimo nukreipia
  }

  function handleLogout() {
    localStorage.removeItem("token");
    setLoggedIn(false);
    navigate("/login"); // 👈 iškart nukreipia atgal į login
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Psichometrinis kredito rizikos modulis</h2>
        <nav>
          <Link to="/">Pradžia</Link>
        </nav>
      </header>

      <Routes>
        {/* Prisijungimo puslapis */}
        <Route path="/login" element={<Login onLogin={handleLogin} />} />

        {/* Administratoriaus puslapis (apsaugotas) */}
        <Route
          path="/admin"
          element={
            loggedIn ? (
              <Admin onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />

        {/* Kliento klausimynas */}
        <Route path="/q/:token" element={<Questionnaire />} />

        {/* Rezultato puslapis */}
        <Route path="/done" element={<Result />} />

        {/* Numatytas kelias */}
        <Route
          path="*"
          element={<Navigate to={loggedIn ? "/admin" : "/login"} replace />}
        />
      </Routes>
    </div>
  );
}
