import express from "express";
import cors from "cors";
import "./db.js";
import api from "./routes.js";
import auth from "./auth.js";

const app = express();
app.use(express.json());

// ⚙️ Leisk per ENV nurodyti frontend kilmę (Netlify domeną)
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
app.use(cors({ origin: FRONTEND_URL }));

// maršrutai
app.use("/api", auth);
app.use("/api", api);

// Render/Heroku priskiria PORT per env
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Serveris veikia http://localhost:${PORT}`));
