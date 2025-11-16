// client/src/components/PkLogo.jsx
import React from "react";

export default function PkLogo({ className = "", style }) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Paskolų klubo lagamino logotipas"
      focusable="false"
    >
      {/* Lagamino rankena */}
      <rect x="22" y="7" width="20" height="8" rx="3" fill="currentColor" />
      {/* Lagamino korpusas */}
      <rect x="4" y="14" width="56" height="42" rx="9" fill="currentColor" />

      {/* Rankos / paspaudimas (baltos figūros) */}
      {/* kairė ranka */}
      <path
        d="M11 35c0-2 1.2-3.8 3-4.6l8-3.4c1.2-.5 2.6-.2 3.5.8l6.8 6.8-4.6 4.6-5.3-5.3-5.2 2.1C14.4 36.5 11 38.2 11 35Z"
        fill="#fff"
        opacity="0.95"
      />
      {/* dešinė ranka */}
      <path
        d="M53 35c0-2-1.2-3.8-3-4.6l-8-3.4c-1.2-.5-2.6-.2-3.5.8l-6.8 6.8 4.6 4.6 5.3-5.3 5.2 2.1c3.8 1.5 6.2 3.2 6.2-0Z"
        fill="#fff"
        opacity="0.95"
      />
      {/* sujungimas / delnai */}
      <path
        d="M24.6 35.4l4.8-4.8a3.5 3.5 0 0 1 5 0l6.8 6.8-4.8 4.8a6 6 0 0 1-8.5 0l-3.3-3.3a3 3 0 0 1 0-4.2Z"
        fill="#fff"
      />
      {/* pirštų akcentai */}
      <rect x="30.2" y="40.4" width="7.6" height="1.8" rx="0.9" fill="#fff" opacity="0.9" />
      <rect x="28.8" y="38" width="6.8" height="1.6" rx="0.8" fill="#fff" opacity="0.9" />
      <rect x="27.4" y="35.8" width="5.8" height="1.4" rx="0.7" fill="#fff" opacity="0.9" />
    </svg>
  );
}