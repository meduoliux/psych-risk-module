// client/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import PkFooter from "./components/PkFooter.jsx";
import Register from "./pages/Register.jsx";

import Login from "./pages/Login.jsx";
import Admin from "./pages/Admin.jsx";
import Manager from "./pages/Manager.jsx";
import Survey from "./pages/Survey.jsx";
import Result from "./pages/Result.jsx";
import Contacts from "./pages/Contacts.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx"; // ⬅️ NAUJA

import PkHeader from "./components/PkHeader.jsx";

function RequireAuth({ children, role }) {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (!token) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function HomeRedirect() {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  if (user.role === "admin") return <Navigate to="/admin" replace />;
  if (user.role === "manager") return <Navigate to="/manager" replace />;
  return <Navigate to="/login" replace />;
}

function ProtectedLayout({ children }) {
  const user = JSON.parse(localStorage.getItem("user") || "null");

  return (
    <div className="app-shell">
      {user ? <PkHeader user={user} /> : null}

      <main className="app-main">
        {children}
      </main>

      <PkFooter className="app-footer" />
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/contacts" element={<Contacts />} />

      <Route
        path="/admin"
        element={
          <RequireAuth role="admin">
            <ProtectedLayout>
              <Admin />
            </ProtectedLayout>
          </RequireAuth>
        }
      />

      <Route
        path="/manager"
        element={
          <RequireAuth role="manager">
            <ProtectedLayout>
              <Manager />
            </ProtectedLayout>
          </RequireAuth>
        }
      />

      <Route path="/q/:token" element={<Survey />} />
      <Route path="/result" element={<Result />} />
      <Route path="/register" element={<Register />} />
      <Route path="*" element={<div style={{ padding: 40 }}>404</div>} />
    </Routes>
  );
}