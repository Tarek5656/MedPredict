import React, { useEffect, useMemo, useState } from "react";
import consultationService from "../../services/consultationService";
import rendezvousService from "../../services/rendezvousService";
import { extractApiError } from "../../utils/format";
import ConsultationFields from "./ConsultationFields";
import OrdonnanceFields from "../ordonnance/OrdonnanceFields";
import { printOrdonnance } from "../../utils/printOrdonnance";

function emptyLine() {
  return { nom: "", dosage: "", frequence: "", duree_jours: "", instructions: "" };
}

function isOrdoEmpty(ordo) {
  if (!ordo) return true;
  const notesOk = (ordo.notes || "").trim().length > 0;
  const hasLine = (ordo.lignes || []).some((l) => (l.nom || "").trim().length > 0);
  return !(notesOk || hasLine);
}

function normalizeOrdonnance(ordo) {
  const notes = (ordo?.notes || "").trim();
  const lignes = (ordo?.lignes || [])
    .filter((l) => (l.nom || "").trim().length > 0)
    .map((l) => ({
      nom: (l.nom || "").trim(),
      dosage: l.dosage || "",
      frequence: l.frequence || "",
      duree_jours: l.duree_jours === "" ? null : l.duree_jours ?? null,
      instructions: l.instructions || "",
    }));
  return { notes, lignes };
}

export default function ConsultationsTab({ patientId, canEdit, patient }) {
  const [consultations, setConsultations] = useState([]);
  const [rdvs, setRdvs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [err, setErr] = useState(null);

  // form création consultation
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    rendezvous: "",
    symptomes: "",
    notes_cliniques: "",
    diagnostic: "",
  });
  const [createSymptomCodes, setCreateSymptomCodes] = useState([]);

  // ordonnance lors de la création
  const [createOrdo, setCreateOrdo] = useState({
    notes: "",
    lignes: [],
  });

  // UI état par consultation
  const [expandedId, setExpandedId] = useState(null);
  const [editDrafts, setEditDrafts] = useState({}); // { [id]: {symptomes, notes_cliniques, diagnostic} }

  const rdvOptions = useMemo(() => rdvs, [rdvs]);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const [cRes, rRes] = await Promise.all([
        consultationService.list({ patient: patientId }),
        rendezvousService.getAll({ patient: patientId, without_consultation: 1 }),
      ]);

      const cData = Array.isArray(cRes.data) ? cRes.data : cRes.data.results || [];
      const rData = Array.isArray(rRes.data) ? rRes.data : rRes.data.results || [];

      setConsultations(cData);
      setRdvs(rData);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId]);

  const startConsultation = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    setErr(null);
    setSavingId("create");
    try {
      if (!createForm.rendezvous) throw new Error("Choisis un rendez-vous.");

      // 1) créer consultation
      const payload = {
        patient: Number(patientId),
        rendezvous: Number(createForm.rendezvous),
        symptomes: createForm.symptomes,
        symptom_codes: createSymptomCodes,
        notes_cliniques: createForm.notes_cliniques,
        diagnostic: createForm.diagnostic,
      };

      const created = await consultationService.create(payload);
      const consultationId = created?.data?.id;

      // 2) si ordonnance non vide => upsert
      const normalized = normalizeOrdonnance(createOrdo);
      if (consultationId && !isOrdoEmpty(normalized)) {
        await consultationService.upsertOrdonnance(consultationId, normalized);
      }

      // reset
      setCreateForm({ rendezvous: "", symptomes: "", notes_cliniques: "", diagnostic: "" });
      setCreateOrdo({ notes: "", lignes: [] });
      setCreateOpen(false);
      setCreateSymptomCodes([]);

      await load();
    } catch (e2) {
      setErr(e2?.message || extractApiError(e2));
    } finally {
      setSavingId(null);
    }
  };

  const toggleExpanded = (c) => {
    setExpandedId((cur) => (cur === c.id ? null : c.id));

    setEditDrafts((prev) => {
      if (prev[c.id]) return prev;

      const symptomCodes =
        Array.isArray(c.symptoms) ? c.symptoms.map((s) => s.code).filter(Boolean) : [];

      const computedText =
        (c.symptomes || "").trim().length > 0
          ? (c.symptomes || "")
          : symptomCodes.join(", ");

      return {
        ...prev,
        [c.id]: {
          symptomes: computedText,
          symptom_codes: symptomCodes,
          notes_cliniques: c.notes_cliniques ?? "",
          diagnostic: c.diagnostic ?? "",
        },
      };
    });
  };

  const saveConsultation = async (consultationId) => {
    if (!canEdit) return;

    setErr(null);
    setSavingId(consultationId);
    try {
      const draft = editDrafts[consultationId] || {};

      const payload = {
        symptomes: draft.symptomes ?? "",
        notes_cliniques: draft.notes_cliniques ?? "",
        diagnostic: draft.diagnostic ?? "",
        symptom_codes: draft.symptom_codes ?? [],
      };

      await consultationService.patch(consultationId, payload);
      await load();

      // ✅ collapse après succès
      setExpandedId(null);
    } catch (e) {
      setErr(extractApiError(e) || "Erreur lors de l’enregistrement.");
    } finally {
      setSavingId(null);
    }
  };

  const deleteOrdonnance = async (consultationId) => {
    if (!canEdit) return;

    const ok = window.confirm("Supprimer l’ordonnance de cette consultation ?");
    if (!ok) return;

    setErr(null);
    setSavingId(`del-ordo-${consultationId}`);
    try {
      await consultationService.deleteOrdonnance(consultationId);
      await load();
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="card border border-gray-100 shadow-sm mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800">
          <i className="fa-solid fa-file-waveform text-primary"></i>
          Consultations
        </h2>

        <div className="flex gap-3">
          {canEdit ? (
            <button 
              type="button" 
              onClick={() => setCreateOpen((v) => !v)}
              className={createOpen ? "outline" : ""}
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
            >
              <i className={`fa-solid ${createOpen ? "fa-minus" : "fa-plus"}`}></i>
              {createOpen ? "Réduire" : "Démarrer consultation"}
            </button>
          ) : null}

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
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!canEdit ? (
        <p style={{ opacity: 0.7, marginTop: 6 }}>
          Seul le médecin (ou admin) peut créer/modifier les consultations et les ordonnances.
        </p>
      ) : null}

      {/* Form création */}
      {canEdit && createOpen ? (
        <form onSubmit={startConsultation} style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div>
            <label>Rendez-vous</label>
            <select
              style={{ width: "100%" }}
              value={createForm.rendezvous}
              onChange={(e) => setCreateForm((s) => ({ ...s, rendezvous: e.target.value }))}
            >
              <option value="">-- choisir --</option>
              {rdvOptions.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {new Date(r.date_heure).toLocaleString()} — {r.motif || "—"} (
                  {r.statut_effectif || r.statut})
                </option>
              ))}
            </select>
          </div>

          <ConsultationFields
            canEdit={canEdit}
            patient={patient}
            symptomes={createForm.symptomes}
            onChangeSymptomes={(v) => setCreateForm((s) => ({ ...s, symptomes: v }))}
            symptomCodes={createSymptomCodes}
            onChangeSymptomCodes={setCreateSymptomCodes}
            notes_cliniques={createForm.notes_cliniques}
            onChangeNotes={(v) => setCreateForm((s) => ({ ...s, notes_cliniques: v }))}
            diagnostic={createForm.diagnostic}
            onChangeDiagnostic={(v) => setCreateForm((s) => ({ ...s, diagnostic: v }))}
          />

          {/* Ordonnance à la création */}
          <OrdonnanceFields ordo={createOrdo} setOrdo={setCreateOrdo} emptyLine={emptyLine} />

          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={savingId === "create"}>{savingId === "create" ? "Création..." : "Créer"}</button>
            <button
              type="button"
              onClick={() => {
                setCreateForm({ rendezvous: "", symptomes: "", notes_cliniques: "", diagnostic: "" });
                setCreateOrdo({ notes: "", lignes: [] });
                setCreateOpen(false);
              }}
              disabled={savingId === "create"}
            >
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p>Chargement...</p> : null}

      <div style={{ marginTop: 10 }}>
        {consultations.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <i className="fa-solid fa-folder-open text-3xl mb-3 opacity-20"></i>
            <p className="font-medium text-gray-400">Aucune consultation enregistrée pour le moment.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {consultations.map((c) => (
              <div key={c.id} style={{ border: "1px solid #f3f4f6", borderRadius: 10, padding: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <b>
                    Consultation #{c.id} — {new Date(c.date).toLocaleString()}
                  </b>
                  <span style={{ opacity: 0.7 }}>RDV: {c.rendezvous ? `#${c.rendezvous}` : "—"}</span>

                  <button style={{ marginLeft: "auto" }} type="button" onClick={() => toggleExpanded(c)}>
                    {expandedId === c.id ? "Réduire" : "Ouvrir"}
                  </button>
                </div>

                {expandedId === c.id ? (
                  <>
                    {/* Edition consultation (autorisé) */}
                    <div style={{ marginTop: 10, display: "grid", gap: 10 }}>

                      <ConsultationFields
                        canEdit={canEdit}
                        patient={patient}
                        symptomes={editDrafts[c.id]?.symptomes ?? c.symptomes ?? ""}
                        onChangeSymptomes={(v) =>
                          setEditDrafts((s) => ({
                            ...s,
                            [c.id]: { ...(s[c.id] || {}), symptomes: v },
                          }))
                        }
                        symptomCodes={editDrafts[c.id]?.symptom_codes ??
                         (Array.isArray(c.symptoms) ? c.symptoms.map((s) => s.code).filter(Boolean) : [])}
                        onChangeSymptomCodes={(codes) =>
                          setEditDrafts((s) => ({
                            ...s,
                            [c.id]: { ...(s[c.id] || {}), symptom_codes: codes },
                          }))
                        }
                        notes_cliniques={editDrafts[c.id]?.notes_cliniques ?? c.notes_cliniques ?? ""}
                        onChangeNotes={(v) =>
                          setEditDrafts((s) => ({
                            ...s,
                            [c.id]: { ...(s[c.id] || {}), notes_cliniques: v },
                          }))
                        }
                        diagnostic={editDrafts[c.id]?.diagnostic ?? c.diagnostic ?? ""}
                        onChangeDiagnostic={(v) =>
                          setEditDrafts((s) => ({
                            ...s,
                            [c.id]: { ...(s[c.id] || {}), diagnostic: v },
                          }))
                        }
                      />

                      {canEdit ? (
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => saveConsultation(c.id)}
                            disabled={savingId === c.id}
                          >
                            {savingId === c.id ? "Enregistrement..." : "Enregistrer consultation"}
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {/* Ordonnance: aperçu lecture seule + supprimer + imprimer */}
                    <div style={{ marginTop: 14, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
                      <h4 style={{ margin: "0 0 8px 0" }}>Ordonnance (aperçu)</h4>

                      {!c.ordonnance ? (
                        <p style={{ opacity: 0.7 }}>— Aucune ordonnance —</p>
                      ) : (
                        <>
                          <p style={{ whiteSpace: "pre-wrap", marginTop: 6 }}>
                            <b>Notes:</b>{"\n"}
                            {c.ordonnance.notes || "—"}
                          </p>

                          <div style={{ marginTop: 10 }}>
                            <b>Médicaments</b>
                            {(c.ordonnance.lignes || []).length === 0 ? (
                              <p style={{ opacity: 0.7, marginTop: 6 }}>— Aucun médicament —</p>
                            ) : (
                              <ul style={{ marginTop: 6 }}>
                                {c.ordonnance.lignes.map((l) => (
                                  <li key={l.id}>
                                    <b>{l.nom}</b>
                                    {l.dosage ? ` — ${l.dosage}` : ""}
                                    {l.frequence ? ` — ${l.frequence}` : ""}
                                    {l.duree_jours != null ? ` — ${l.duree_jours} j` : ""}
                                    {l.instructions ? ` — ${l.instructions}` : ""}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button
                              type="button"
                              onClick={() =>
                                printOrdonnance({
                                  consultation: c,
                                  patient,
                                  ordonnance: c.ordonnance,
                                })
                              }
                            >
                              Imprimer
                            </button>

                            {canEdit ? (
                              <button
                                type="button"
                                onClick={() => deleteOrdonnance(c.id)}
                                disabled={savingId === `del-ordo-${c.id}`}
                              >
                                {savingId === `del-ordo-${c.id}` ? "Suppression..." : "Supprimer ordonnance"}
                              </button>
                            ) : null}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}