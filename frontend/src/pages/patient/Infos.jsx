import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import patientService from "../../services/patientService";
import userService from "../../services/userService";
import { extractApiError } from "../../utils/format";

export default function Infos() {
  const [patient, setPatient] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [me, setMe] = useState(null);

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [meRes, pRes, dmRes] = await Promise.all([
        userService.me(),                 // infos user connecté (roles, etc.)
        patientService.me(),              // ✅ patient connecté
        patientService.meDossierMedical() // ✅ dossier du patient connecté
      ]);

      setMe(meRes.data);
      setPatient(pRes.data);
      setDossier(dmRes.data);
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

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 24 }}>
        <button
          type="button"
          onClick={goBack}
          className="outline"
          style={{ padding: "8px 16px", fontSize: "0.9rem" }}
        >
          ← Retour
        </button>

        <h1 style={{ margin: 0, fontSize: "2rem", color: "var(--primary)", letterSpacing: "-0.02em" }}>
          {patient.nom} {patient.prenom}
        </h1>

        <button style={{ marginLeft: "auto" }} onClick={load} disabled={loading}>
          Rafraîchir
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Infos patient</h3>
          <p><b>Téléphone:</b> {patient.telephone || "—"}</p>
          <p><b>Email:</b> {patient.email || "—"}</p>
          <p><b>Adresse:</b> {patient.adresse || "—"}</p>
          <p><b>Date naissance:</b> {patient.date_naissance || "—"}</p>
          <p><b>Sexe:</b> {patient.sexe || "—"}</p>
          <p><b>Groupe sanguin:</b> {patient.groupe_sanguin || "—"}</p>
        </div>

        <div className="card">
          <h3 style={{ marginTop: 0 }}>Dossier médical</h3>
          <p style={{ whiteSpace: "pre-wrap" }}>
            <b>Antécédents médicaux:</b>{"\n"}
            {dossier?.antecedents_medicaux || "—"}
          </p>
          <p style={{ whiteSpace: "pre-wrap" }}>
            <b>Antécédents familiaux:</b>{"\n"}
            {dossier?.antecedents_familiaux || "—"}
          </p>
        </div>
      </div>
    </div>
  );
}