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
  const canEditDossierRole = isAdmin || isSecretaire || isMedecin;

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

  const [activeTab, setActiveTab] = useState("consultations");
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
        <button
          type="button"
          onClick={goBack}
          className="outline"
          style={{ padding: "8px 16px", fontSize: "0.9rem", marginTop: 4 }}
        >
          ← Retour
        </button>
        
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

        <button style={{ marginTop: 4 }} onClick={load} disabled={loading}>
          Rafraîchir
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Patient card */}
        <div className={editPatientMode ? "card" : "card card-hero p-8 overflow-hidden relative"}>
          <div className="relative z-10">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: editPatientMode ? 0 : 24 }}>
              <h2 className={editPatientMode ? "text-xl font-bold m-0" : "text-2xl font-bold m-0 flex items-center gap-3"}>
                <i className="fa-solid fa-id-card"></i> Infos Patient
              </h2>

              {!editPatientMode && canEditPatientRole ? (
                <button
                  style={{ marginLeft: "auto", background: "white", color: "var(--primary)" }}
                  disabled={loading}
                  onClick={() => setEditPatientMode(true)}
                >
                  Modifier
                </button>
              ) : null}
            </div>

            {!editPatientMode ? (
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

                {/* Message de restriction supprimé */}

                {/* garde aussi ton fallback backend 403 si tu veux */}
                {/* Message de restriction backend supprimé */}
              </div>
            ) : (
              <>
                {/* Sécurité UI: si quelqu’un force le mode édition */}
                {!canEditPatientRole ? (
                  <button type="button" onClick={() => setEditPatientMode(false)} disabled={loading}>
                    Fermer
                  </button>
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
        </div>

        {/* Dossier card */}
        <div className="card border-2 border-primary/10">
          <h2 className="text-xl font-bold mb-6 text-primary flex items-center gap-3">
            <i className="fa-solid fa-notes-medical"></i> Dossier Médical
          </h2>

          {!editDossierMode ? (
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

              {canEditDossierRole ? (
                <button disabled={loading} onClick={() => setEditDossierMode(true)}>
                  Modifier
                </button>
              ) : null}

              {/* Message de restriction supprimé */}

              {/* garde aussi ton fallback backend 403 si tu veux */}
              {/* Message de restriction backend supprimé */}
            </div>
          ) : (
            <>
              {/* Sécurité UI: si quelqu’un force le mode édition */}
              {!canEditDossierRole ? (
                <>
                  <p style={{ color: "#b45309" }}>
                    Vous ne pouvez pas modifier le dossier médical.
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

      {/* Premium Tabs Section */}
      <div className="flex p-1.5 bg-gray-100/60 rounded-2xl mb-8 w-fit border border-gray-100 shadow-sm">
        <button
          onClick={() => setActiveTab("consultations")}
          className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === "consultations"
              ? "bg-primary text-white shadow-lg transform scale-105"
              : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
          }`}
          style={{ boxShadow: activeTab === "consultations" ? 'var(--shadow-md)' : 'none' }}
        >
          <i className="fa-solid fa-file-waveform"></i>
          Consultations
        </button>
        <button
          onClick={() => setActiveTab("rdv")}
          className={`flex items-center gap-3 px-8 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
            activeTab === "rdv"
              ? "bg-primary text-white shadow-lg transform scale-105"
              : "text-gray-400 hover:text-gray-600 hover:bg-white/50"
          }`}
          style={{ boxShadow: activeTab === "rdv" ? 'var(--shadow-md)' : 'none' }}
        >
          <i className="fa-regular fa-calendar-check"></i>
          Rendez-vous
        </button>
      </div>

      <div className="relative">
        <div style={{ display: activeTab === "consultations" ? "block" : "none" }} className="animate-fadeIn">
          {isAdmin || isMedecin ? (
            <ConsultationsTab
              patientId={patient.id}
              canEdit={isAdmin || isMedecin}
              patient={patient}
            />
          ) : (
            <div className="card p-12 text-center text-gray-500 bg-gray-50/50">
              <i className="fa-solid fa-lock text-3xl mb-4 opacity-20"></i>
              <p className="font-semibold text-lg">Accès Restreint</p>
              <p className="text-sm">Seul le personnel médical peut consulter les dossiers cliniques.</p>
            </div>
          )}
        </div>
        
        <div style={{ display: activeTab === "rdv" ? "block" : "none" }} className="animate-fadeIn">
          <RendezVousTab patientId={patient.id} canCreate={isSecretaire || isAdmin} />
        </div>
      </div>
    </div>
  );
}