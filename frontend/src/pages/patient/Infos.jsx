import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import patientService from "../../services/patientService";
import userService from "../../services/userService";
import dashboardService from "../../services/dashboardService";
import { extractApiError } from "../../utils/format";

export default function Infos() {
  const [patient, setPatient] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [me, setMe] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [meRes, pRes, dmRes, dashRes] = await Promise.all([
        userService.me(),                 // infos user connecté (roles, etc.)
        patientService.me(),              // ✅ patient connecté
        patientService.meDossierMedical(), // ✅ dossier du patient connecté
        dashboardService.getStats()       // ✅ stats du dashboard
      ]);

      setMe(meRes.data);
      setPatient(pRes.data);
      setDossier(dmRes.data);
      setDashboardData(dashRes.data);
    } catch (e) {
      setErr(extractApiError(e) || "Erreur lors du chargement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading && !patient) return <p style={{ padding: 12 }}>Chargement...</p>;
  if (err && !patient) return <p style={{ color: "crimson", padding: 12 }}>{err}</p>;
  if (!patient) return null;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/overview"); // ou la route principale patient
  };

  const getAge = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const getInitials = (nom, prenom) => {
    const n = nom ? nom.charAt(0).toUpperCase() : "";
    const p = prenom ? prenom.charAt(0).toUpperCase() : "";
    return `${p}${n}`; // Usually Prenom then Nom for initials
  };

  const age = getAge(patient.date_naissance);

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 32 }}>
        <div style={{ display: "flex", gap: 20, alignItems: "center", flex: 1, paddingLeft: 8 }}>
          {/* Avatar Initials */}
          <div style={{ 
            width: 64, height: 64, borderRadius: "50%", 
            background: "linear-gradient(135deg, var(--primary), var(--primary-hover))",
            color: "white", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.75rem", fontWeight: 700, letterSpacing: "1px",
            boxShadow: "var(--shadow-sm)"
          }}>
            {getInitials(patient.nom, patient.prenom)}
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Name and Badge Row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ margin: 0, fontSize: "1.75rem", color: "var(--text-main)", letterSpacing: "-0.02em", fontWeight: 700 }}>
                {patient.prenom} {patient.nom}
              </h1>
            </div>

            {/* Demographic Subtitle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: 500 }}>
              {age !== null ? <span>{age} ans</span> : <span>Âge inconnu</span>}
              <span style={{ color: "var(--border-color)" }}>•</span>
              {patient.sexe ? <span>{patient.sexe === 'M' ? 'Homme' : 'Femme'}</span> : <span>Sexe non précisé</span>}
              <span style={{ color: "var(--border-color)" }}>•</span>
              {patient.groupe_sanguin ? (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <i className="fa-solid fa-droplet" style={{ color: "var(--danger)", fontSize: "0.85rem" }}></i>
                  {patient.groupe_sanguin}
                </span>
              ) : <span>Groupe sanguin inconnu</span>}
            </div>
          </div>
        </div>

        <button 
          onClick={load} 
          disabled={loading}
          className="outline"
          style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
        >
          <i className={`fa-solid fa-arrows-rotate ${loading ? "fa-spin" : ""}`}></i>
          Rafraîchir
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div className="card card-hero p-8 overflow-hidden relative">
          <div className="relative z-10">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <i className="fa-solid fa-id-card"></i> Infos Patient
            </h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="opacity-80 text-xs uppercase tracking-wider mb-1">Téléphone</p>
                <p className="font-semibold text-lg">{patient.telephone || "—"}</p>
              </div>
              <div>
                <p className="opacity-80 text-xs uppercase tracking-wider mb-1">Email</p>
                <p className="font-semibold text-lg truncate" title={patient.email}>{patient.email || "—"}</p>
              </div>
              <div className="col-span-2">
                <p className="opacity-80 text-xs uppercase tracking-wider mb-1">Adresse</p>
                <p className="font-semibold text-lg">{patient.adresse || "—"}</p>
              </div>
              <div>
                <p className="opacity-80 text-xs uppercase tracking-wider mb-1">Date Naissance</p>
                <p className="font-semibold text-lg">{patient.date_naissance || "—"}</p>
              </div>
              <div>
                <p className="opacity-80 text-xs uppercase tracking-wider mb-1">Sexe & Groupe</p>
                <p className="font-semibold text-lg">{patient.sexe || "—"} <span className="opacity-50 mx-1">•</span> {patient.groupe_sanguin || "—"}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card border-2 border-primary/10">
          <h2 className="text-xl font-bold mb-6 text-primary flex items-center gap-3">
            <i className="fa-solid fa-notes-medical"></i> Dossier Médical
          </h2>
          <div className="space-y-6">
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                <i className="fa-solid fa-virus text-primary"></i> Antécédents Médicaux
              </h3>
              <p className="text-gray-600 whitespace-pre-wrap text-sm">
                {dossier?.antecedents_medicaux || "Aucun antécédent médical enregistré."}
              </p>
            </div>
            
            <div className="bg-primary/5 p-4 rounded-xl border border-primary/10">
              <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-2">
                <i className="fa-solid fa-users text-primary"></i> Antécédents Familiaux
              </h3>
              <p className="text-gray-600 whitespace-pre-wrap text-sm">
                {dossier?.antecedents_familiaux || "Aucun antécédent familial enregistré."}
              </p>
            </div>
          </div>
        </div>
      </div>

      {dashboardData && dashboardData.role === 'patient' && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {dashboardData.nextVisit && (
            <div className="card card-hero p-8 overflow-hidden relative">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2">Mon Prochain Rendez-vous</h2>
                <div className="text-5xl font-black mb-4">{dashboardData.nextVisit.day}</div>
                <div className="flex items-center gap-4 text-primary-light">
                  <div className="flex flex-col">
                    <span className="text-xs opacity-80 uppercase tracking-tighter">Heure</span>
                    <span className="font-bold">{dashboardData.nextVisit.time}</span>
                  </div>
                  <div className="w-px h-8 bg-white/20"></div>
                  <div className="flex flex-col">
                    <span className="text-xs opacity-80 uppercase tracking-tighter">Médecin</span>
                    <span className="font-bold">{dashboardData.nextVisit.doctor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <h3 className="text-lg font-semibold mb-6">Dernière Ordonnance</h3>
            <div className="space-y-4">
              {!dashboardData.activePrescriptions || dashboardData.activePrescriptions.length === 0 ? (
                <div className="text-gray-500 text-sm">Aucune ordonnance active.</div>
              ) : (
                dashboardData.activePrescriptions.slice(0, 1).map((pres, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg bg-white text-primary">
                        <i className="fa-solid fa-pills"></i>
                      </div>
                      <div className="font-bold text-gray-900">{pres.med}</div>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">{pres.dose}</div>
                    <div className="text-xs font-semibold text-primary">{pres.duration}</div>
                  </div>
                ))
              )}
            </div>
            <button className="w-full mt-6 outline" onClick={() => navigate("/patient/consultation")}>
              Voir toutes les ordonnances
            </button>
          </div>
        </div>
      )}
    </div>
  );
}