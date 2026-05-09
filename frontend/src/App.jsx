import React, { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Login from "./pages/Login.jsx";
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

const isLoggedIn = () => Boolean(localStorage.getItem("access_token"));

function RoleRoute({ children, allowGroups = [], allowSuperuser = true }) {
  const location = useLocation();
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  let alive = true;

  const run = async () => {
      // on démarre en mode "checking"
      try {
        if (!isLoggedIn()) {
          if (alive) {
            setMe(null);
            setLoading(false);
          }
          return;
        }

        const res = await userService.me();
        if (alive) setMe(res.data);
      } catch (e) {
        // IMPORTANT: si me() échoue, on force logout => casse la boucle
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        if (alive) setMe(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    run();
    return () => {
      alive = false;
    };
  }, []);

  if (loading) return null;  // ✅ attendre la fin du check
  if (!isLoggedIn()) return <Navigate to="/login" state={{ from: location }} replace />;

  const groups = (me?.groups || []).map((g) => String(g).trim().toUpperCase());

  if (allowSuperuser && me?.is_superuser) return children;
  if (allowGroups.length === 0) return children;

  const ok = allowGroups.some((g) => groups.includes(g));
  return ok ? children : <Navigate to="/unauthorized" replace />;
}

export default function App() {
  useEffect(() => {
    const boot = async () => {
      try {
        const me = (await userService.me()).data;
        applyTheme(themeFromMe(me));
      } catch {
        applyTheme("green");
      }
    };
    boot();
  }, []);

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/unauthorized" element={<div>Accès refusé</div>} />

          <Route
            path="/overview"
            element={
              <RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}>
                <Overview />
              </RoleRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}>
                <PatientsList />
              </RoleRoute>
            }
          />
          <Route
            path="/patients/:id"
            element={
              <RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}>
                <PatientDetail />
              </RoleRoute>
            }
          />
          <Route
            path="/rendezvous"
            element={
              <RoleRoute allowGroups={["MEDECIN", "SECRETAIRE"]}>
                <RendezVousListPage />
              </RoleRoute>
            }
          />
          <Route
            path="/notifications/liste"
            element={
              <RoleRoute allowGroups={["MEDECIN", "SECRETAIRE", "PATIENT"]}>
                <NotificationListe />
              </RoleRoute>
            }
          />
          <Route
            path="/calendrier"
            element={
              <RoleRoute allowGroups={["MEDECIN", "SECRETAIRE", "PATIENT"]}>
                <Calendrier />
              </RoleRoute>
            }
          />
          <Route
            path="/calendrier/jour"
            element={
              <RoleRoute allowGroups={["MEDECIN", "SECRETAIRE", "PATIENT"]}>
                <CalendrierJour />
              </RoleRoute>
            }
          />
          <Route
            path="/patient/infos"
            element={
              <RoleRoute allowGroups={["PATIENT"]}>
                <Infos />
              </RoleRoute>
            }
          />
          <Route
            path="/patient/rendezvous"
            element={
              <RoleRoute allowGroups={["PATIENT"]}>
                <RendezVousListe />
              </RoleRoute>
            }
          />
          <Route
            path="/patient/consultation"
            element={
              <RoleRoute allowGroups={["PATIENT"]}>
                <ConsultationListe />
              </RoleRoute>
            }
          />
          <Route 
            path="/analyses" 
            element={
              <RoleRoute allowGroups={["MEDECIN"]}>
                <Analyses />
              </RoleRoute>
            } 
          />
          <Route 
            path="/admin/dashboard" 
            element={
              <RoleRoute allowSuperuser={true} allowGroups={["ADMIN"]}>
                <AdminDashboard />
              </RoleRoute>
            } 
          />

          {/* ⚠️ Toujours en dernier */}
          <Route path="*" element={<Navigate to="/patients" replace />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}