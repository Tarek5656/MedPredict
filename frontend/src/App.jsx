import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
import { Toaster } from 'react-hot-toast';
import PatientsList from "./pages/PatientListe";
import PatientDetail from "./pages/PatientDetails";
import AppLayout from "./components/AppLayout";
import RendezVousListPage from "./pages/RendezVousListPage";
import Infos from "./pages/patient/Infos.jsx";
import RendezVousListe from "./pages/patient/RendezVousListe.jsx";
import ConsultationListe from "./pages/patient/ConsultationListe.jsx";
import Calendrier from "./pages/Calendrier.jsx";
import CalendrierJour from "./pages/CalendrierJour.jsx";
import Analyses from "./pages/medecin/Analyses.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Overview from "./pages/Overview.jsx";
import AdminDashboard from "./pages/admin/AdminDashboard.jsx";
import NotificationListe from "./pages/NotificationListe.jsx";
import { applyTheme, themeFromMe } from "./utils/theme";
import userService from "./services/userService.js";
import ChatWindow from "./components/messaging/ChatWindow.jsx";
import { MessagingProvider } from "./context/MessagingContext";

const isLoggedIn = () => Boolean(localStorage.getItem("access_token"));

function RoleRoute({ children, allowGroups = [], allowSuperuser = true }) {
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        if (!isLoggedIn()) {
          if (alive) setLoading(false);
          return;
        }
        const res = await userService.me();
        if (alive) setMe(res.data);
      } catch (e) {
        if (alive) {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          setMe(null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => { alive = false; };
  }, []);

  if (loading) return null;
  if (!isLoggedIn()) return <Navigate to="/login" state={{ from: location }} replace />;

  if (allowSuperuser && me?.is_superuser) return children;

  // Normalisation des groupes pour éviter les crashs
  const userGroups = (me?.groups || []).map(g => {
    if (typeof g === 'string') return g.trim().toUpperCase();
    if (g && typeof g === 'object' && g.name) return g.name.trim().toUpperCase();
    return String(g).trim().toUpperCase();
  });

  if (allowGroups.length === 0) return children;

  const hasAccess = allowGroups.some(g => userGroups.includes(g.toUpperCase()));
  return hasAccess ? children : <Navigate to="/unauthorized" replace />;
}

export default function App() {
  useEffect(() => {
    const boot = async () => {
      try {
        if (isLoggedIn()) {
          const res = await userService.me();
          applyTheme(themeFromMe(res.data));
        }
      } catch {
        applyTheme("green");
      }
    };
    boot();
  }, []);

  return (
    <MessagingProvider>
      <BrowserRouter>
        <Toaster position="top-right" reverseOrder={false} />
        <AppLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<LandingPage />} />
            <Route path="/unauthorized" element={<div style={{padding: 50, textAlign:'center'}}>Accès refusé</div>} />

            <Route path="/overview" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}><Overview /></RoleRoute>} />
            <Route path="/patients" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}><PatientsList /></RoleRoute>} />
            <Route path="/patients/:id" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}><PatientDetail /></RoleRoute>} />
            <Route path="/rendezvous" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}><RendezVousListPage /></RoleRoute>} />
            <Route path="/notifications/liste" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE", "PATIENT"]}><NotificationListe /></RoleRoute>} />
            <Route path="/calendrier" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE", "PATIENT"]}><Calendrier /></RoleRoute>} />
            <Route path="/calendrier/jour" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE", "PATIENT"]}><CalendrierJour /></RoleRoute>} />
            <Route path="/patient/infos" element={<RoleRoute allowGroups={["PATIENT"]}><Infos /></RoleRoute>} />
            <Route path="/patient/rendezvous" element={<RoleRoute allowGroups={["PATIENT"]}><RendezVousListe /></RoleRoute>} />
            <Route path="/patient/consultation" element={<RoleRoute allowGroups={["PATIENT"]}><ConsultationListe /></RoleRoute>} />
            <Route path="/analyses" element={<RoleRoute allowGroups={["MEDECIN"]}><Analyses /></RoleRoute>} />
            <Route path="/messaging" element={<RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]} allowSuperuser={false}><ChatWindow /></RoleRoute>} />
            <Route path="/admin/dashboard" element={<RoleRoute allowSuperuser={true}><AdminDashboard /></RoleRoute>} />

            <Route path="*" element={<Navigate to="/overview" replace />} />
          </Routes>
        </AppLayout>
      </BrowserRouter>
    </MessagingProvider>
  );
}