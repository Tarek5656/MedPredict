import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import patientService from "../services/patientService";
import userService from "../services/userService";
import { extractApiError, formatDateTime } from "../utils/format";
import RendezVousTab from "../components/rendezvous/RendezVousTab";
import ConsultationsTab from "../components/consultation/ConsultationsTab";

export default function PatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [dossier, setDossier] = useState(null);
  const navigate = useNavigate(); 

  const [me, setMe] = useState(null);
  const isMedecin = (me?.groups || []).includes("MEDECIN");
  const isSecretaire = (me?.groups || []).includes("SECRETAIRE");
  const isSuperuser = !!me?.is_superuser;
  const isAdmin = isSuperuser || (me?.groups || []).includes("ADMIN");

  const canEditPatientRole = isAdmin || isSecretaire;
  const canEditDossierRole = isAdmin || isSecretaire;

  // ---- Edit patient (secrétaire) ----
  const [editPatientMode, setEditPatientMode] = useState(false);
  const [canEditPatient, setCanEditPatient] = useState(true);
  const [patientEdit, setPatientEdit] = useState({
    telephone: "",
    email: "",
    adresse: "",
    date_naissance: "",
    sexe: "",
    groupe_sanguin: "",
  });

  // ---- Edit dossier (médecin) ----
  const [editDossierMode, setEditDossierMode] = useState(false);
  const [canEditDossier, setCanEditDossier] = useState(true);
  const [dossierEdit, setDossierEdit] = useState({
    antecedents_medicaux: "",
    antecedents_familiaux: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [p, dm, meRes] = await Promise.all([
        patientService.getById(id),
        patientService.getDossierMedical(id),
        userService.me(),
      ]);

      setMe(meRes.data);

      setPatient(p.data);
      setPatientEdit({
        telephone: p.data.telephone || "",
        email: p.data.email || "",
        adresse: p.data.adresse || "",
        date_naissance: p.data.date_naissance || "",
        sexe: p.data.sexe || "",
        groupe_sanguin: p.data.groupe_sanguin || "",
      });

      setDossier(dm.data);
      setDossierEdit({
        antecedents_medicaux: dm.data.antecedents_medicaux || "",
        antecedents_familiaux: dm.data.antecedents_familiaux || "",
      });

      setCanEditPatient(true);
      setCanEditDossier(true);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const savePatient = async () => {
  setErr(null);
  setLoading(true);
  try {
      const payload = {
        telephone: patientEdit.telephone,
        email: patientEdit.email,
        adresse: patientEdit.adresse,
        date_naissance: patientEdit.date_naissance || null,
        sexe: patientEdit.sexe || null,
        groupe_sanguin: patientEdit.groupe_sanguin || null,
      };

      const res = await patientService.patch(id, payload);
      setPatient(res.data);
      setEditPatientMode(false);
      setCanEditPatient(true);
    } catch (e) {
      if (e?.response?.status === 403) {
        setCanEditPatient(false);
        setErr("Seule la secrétaire (ou admin) peut modifier les infos du patient.");
      } else {
        setErr(extractApiError(e));
      }
    } finally {
      setLoading(false);
    }
  };

const saveDossier = async () => {
  setErr(null);
  setLoading(true);
  try {
    const res = await patientService.patchDossierMedical(id, dossierEdit);
    setDossier(res.data);
    setEditDossierMode(false);
    setCanEditDossier(true);
  } catch (e) {
    if (e?.response?.status === 403) {
      setCanEditDossier(false);
      setErr("Seul le médecin peut modifier le dossier médical.");
    } else {
      setErr(extractApiError(e));
    }
  } finally {
    setLoading(false);
  }
};

  if (loading && !patient) return <p style={{ padding: 12 }}>Chargement...</p>;
  if (err && !patient) return <p style={{ color: "crimson", padding: 12 }}>{err}</p>;
  if (!patient) return null;

  const goBack = () => {            // ✅
    if (window.history.length > 1) navigate(-1);
    else navigate("/patients");
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
          Patient #{patient.id} — {patient.nom} {patient.prenom}
        </h1>
        <button style={{ marginLeft: "auto" }} onClick={load} disabled={loading}>
          Rafraîchir
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Patient card */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Infos patient</h3>

            {!editPatientMode && canEditPatientRole ? (
              <button
                style={{ marginLeft: "auto" }}
                disabled={loading}
                onClick={() => setEditPatientMode(true)}
              >
                Modifier ({isAdmin ? "Admin" : "Secrétaire"})
              </button>
            ) : null}
          </div>

          {!editPatientMode ? (
            <>
              <p><b>Téléphone:</b> {patient.telephone || ""}</p>
              <p><b>Email:</b> {patient.email || ""}</p>
              <p><b>Adresse:</b> {patient.adresse || ""}</p>
              <p><b>Date naissance:</b> {patient.date_naissance || ""}</p>
              <p><b>Sexe:</b> {patient.sexe || ""}</p>
              <p><b>Groupe sanguin:</b> {patient.groupe_sanguin || ""}</p>

              {!canEditPatientRole ? (
                <p style={{ color: "#b45309", marginTop: 8 }}>
                  Seule la secrétaire (ou admin) peut modifier les informations du patient.
                </p>
              ) : null}

              {/* garde aussi ton fallback backend 403 si tu veux */}
              {canEditPatientRole && !canEditPatient ? (
                <p style={{ color: "#b45309" }}>Tu n’as pas les droits pour modifier.</p>
              ) : null}
            </>
          ) : (
            <>
              {/* Sécurité UI: si quelqu’un force le mode édition */}
              {!canEditPatientRole ? (
                <>
                  <p style={{ color: "#b45309" }}>
                    Seule la secrétaire (ou admin) peut modifier les informations du patient.
                  </p>
                  <button type="button" onClick={() => setEditPatientMode(false)} disabled={loading}>
                    Fermer
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label>Téléphone</label>
                    <input
                      style={{ width: "100%" }}
                      value={patientEdit.telephone}
                      onChange={(e) => setPatientEdit((s) => ({ ...s, telephone: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Email</label>
                    <input
                      style={{ width: "100%" }}
                      value={patientEdit.email}
                      onChange={(e) => setPatientEdit((s) => ({ ...s, email: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Adresse</label>
                    <textarea
                      style={{ width: "100%", minHeight: 70 }}
                      value={patientEdit.adresse}
                      onChange={(e) => setPatientEdit((s) => ({ ...s, adresse: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Date naissance</label>
                    <input
                      type="date"
                      style={{ width: "100%" }}
                      value={patientEdit.date_naissance}
                      onChange={(e) => setPatientEdit((s) => ({ ...s, date_naissance: e.target.value }))}
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Sexe</label>
                    <select
                      style={{ width: "100%" }}
                      value={patientEdit.sexe}
                      onChange={(e) => setPatientEdit((s) => ({ ...s, sexe: e.target.value }))}
                    >
                      <option value="">--</option>
                      <option value="M">Masculin</option>
                      <option value="F">Féminin</option>
                    </select>
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Groupe sanguin</label>
                    <select
                      style={{ width: "100%" }}
                      value={patientEdit.groupe_sanguin}
                      onChange={(e) =>
                        setPatientEdit((s) => ({ ...s, groupe_sanguin: e.target.value }))
                      }
                    >
                      <option value="">--</option>
                      <option value="A+">A positif</option>
                      <option value="A-">A négatif</option>
                      <option value="B+">B positif</option>
                      <option value="B-">B négatif</option>
                      <option value="AB+">AB positif</option>
                      <option value="AB-">AB négatif</option>
                      <option value="O+">O positif</option>
                      <option value="O-">O négatif</option>
                    </select>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button disabled={loading} onClick={savePatient}>
                      {loading ? "Enregistrement..." : "Enregistrer"}
                    </button>

                    <button
                      disabled={loading}
                      onClick={() => {
                        setEditPatientMode(false);
                        setPatientEdit({
                          telephone: patient.telephone || "",
                          email: patient.email || "",
                          adresse: patient.adresse || "",
                          date_naissance: patient.date_naissance || "",
                          sexe: patient.sexe || "",
                          groupe_sanguin: patient.groupe_sanguin || "",
                        });
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Dossier card */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Dossier médical</h3>
          </div>

          {!editDossierMode ? (
            <>
              <p style={{ whiteSpace: "pre-wrap" }}>
                <b>Antécédents médicaux:</b>{"\n"}
                {dossier?.antecedents_medicaux || "—"}
              </p>
              <p style={{ whiteSpace: "pre-wrap" }}>
                <b>Antécédents familiaux:</b>{"\n"}
                {dossier?.antecedents_familiaux || "—"}
              </p>

              {canEditDossierRole ? (
                <button disabled={loading} onClick={() => setEditDossierMode(true)}>
                  Modifier ({isAdmin ? "Admin" : "Secrétaire"})
                </button>
              ) : null}

              {!canEditDossierRole ? (
                <p style={{ color: "#b45309", marginTop: 8 }}>
                  Seul la secrétaire (ou admin) peut modifier le dossier médical.
                </p>
              ) : null}

              {/* garde aussi ton fallback backend 403 si tu veux */}
              {canEditDossierRole && !canEditDossier ? (
                <p style={{ color: "#b45309" }}>Tu n’as pas les droits pour modifier.</p>
              ) : null}
            </>
          ) : (
            <>
              {/* Sécurité UI: si quelqu’un force le mode édition */}
              {!canEditDossierRole ? (
                <>
                  <p style={{ color: "#b45309" }}>
                    Seul la secrétaire (ou admin) peut modifier le dossier médical.
                  </p>
                  <button type="button" onClick={() => setEditDossierMode(false)} disabled={loading}>
                    Fermer
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label>Antécédents médicaux</label>
                    <textarea
                      style={{ width: "100%", minHeight: 90 }}
                      value={dossierEdit.antecedents_medicaux}
                      onChange={(e) =>
                        setDossierEdit((s) => ({ ...s, antecedents_medicaux: e.target.value }))
                      }
                    />
                  </div>

                  <div style={{ marginTop: 10 }}>
                    <label>Antécédents familiaux</label>
                    <textarea
                      style={{ width: "100%", minHeight: 90 }}
                      value={dossierEdit.antecedents_familiaux}
                      onChange={(e) =>
                        setDossierEdit((s) => ({ ...s, antecedents_familiaux: e.target.value }))
                      }
                    />
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button disabled={loading} onClick={saveDossier}>
                      {loading ? "Enregistrement..." : "Enregistrer"}
                    </button>

                    <button
                      disabled={loading}
                      onClick={() => {
                        setEditDossierMode(false);
                        setDossierEdit({
                          antecedents_medicaux: dossier?.antecedents_medicaux || "",
                          antecedents_familiaux: dossier?.antecedents_familiaux || "",
                        });
                      }}
                    >
                      Annuler
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
      {(isAdmin || isMedecin) ? (
        <ConsultationsTab
          patientId={patient.id}
          canEdit={isAdmin || isMedecin}
          patient={patient}
        />
      ) : null}      
      {/* ✅ RDV en dessous, pleine largeur */}
      <RendezVousTab patientId={patient.id} canCreate={isSecretaire || isAdmin} />
    </div>
  );
}