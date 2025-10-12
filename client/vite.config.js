import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ⚙️ Konfigūracija
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001", // jungiamės prie backend
    },
  },
  build: {
    outDir: "dist",
  },
});
