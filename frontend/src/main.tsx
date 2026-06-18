import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App";
import DivinePage from "./pages/DivinePage";
import BaziPage from "./pages/BaziPage";
import HistoryPage from "./pages/HistoryPage";
import "./styles/global.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        <Route path="/" element={<App />}>
          <Route index element={<Navigate to="/divine" replace />} />
          <Route path="divine" element={<DivinePage />} />
          <Route path="bazi" element={<BaziPage />} />
          <Route path="history" element={<HistoryPage />} />
        </Route>
      </Routes>
    </HashRouter>
  </React.StrictMode>
);
