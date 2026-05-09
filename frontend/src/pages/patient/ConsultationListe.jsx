import React, { useEffect, useState } from "react";
import consultationService from "../../services/consultationService";
import patientService from "../../services/patientService";
import { extractApiError } from "../../utils/format";
import { printOrdonnance } from "../../utils/printOrdonnance";

export default function ConsultationsPatient() {
  const [items, setItems] = useState([]);
  const [patient, setPatient] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const count = items.length;

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [cRes, pRes] = await Promise.all([
        consultationService.me(),
        patientService.me(),
      ]);
      const data = Array.isArray(cRes.data) ? cRes.data : cRes.data.results || [];
      setItems(data);
      setPatient(pRes.data);
    } catch (e) {
      setErr(extractApiError(e));
      } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));

  if (err) return <p style={{ color: "crimson", padding: 12 }}>{err}</p>;

  return (
    <div className="page-container animate-fade-in">
      {loading && <p>Chargement...</p>}
      {err && <p style={{ color: "red" }}>Erreur: {err}</p>}

      {!loading && !err && count === 0 && <p>Aucune consultation à afficher.</p>}
      {!loading && !err && count > 0 && (
        <>
      {items.map((c) => {
        const open = expandedId === c.id;
        return (
          <div key={c.id} className="card" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontWeight: 700 }}>
                Consultation #{c.id} — {c.date ? new Date(c.date).toLocaleString() : "—"}
              </div>

              <button style={{ marginLeft: "auto" }} onClick={() => toggle(c.id)}>
                {open ? "Réduire" : "Détails"}
              </button>
            </div>

            {open && (
              <div style={{ marginTop: 12 }}>
                <p><b>Symptômes:</b></p>
                {Array.isArray(c.symptoms) && c.symptoms.length > 0 ? (
                  <ul style={{ marginTop: 6 }}>
                    {c.symptoms.map((s) => (
                      <li key={s.id}>
                        {s.label?.trim() ? s.label : s.code}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">—</p>
                )}
                <p><b>Diagnostic:</b> {c.diagnostic || "—"}</p>
                <p style={{ whiteSpace: "pre-wrap" }}><b>Notes cliniques:</b>{"\n"}{c.notes_cliniques || "—"}</p>

                <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() =>
                      printOrdonnance({ consultation: c, patient, ordonnance: c.ordonnance })
                    }
                    disabled={!c.ordonnance}
                    title={!c.ordonnance ? "Aucune ordonnance" : "Imprimer"}
                  >
                    Imprimer ordonnance
                  </button>
                </div>

                {/* aperçu ordonnance (read-only) */}
                {c.ordonnance ? (
                  <div style={{ marginTop: 12 }}>
                    <p style={{ whiteSpace: "pre-wrap" }}>
                      <b>Ordonnance (notes):</b>{"\n"}{c.ordonnance.notes || "—"}
                    </p>

                    {Array.isArray(c.ordonnance.lignes) && c.ordonnance.lignes.length > 0 ? (
                      <ul>
                        {c.ordonnance.lignes.map((l) => (
                          <li key={l.id}>
                            {l.nom} — {l.dosage} — {l.frequence} — {l.duree_jours}j
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="muted">— Aucun médicament —</p>
                    )}
                  </div>
                ) : (
                  <p className="muted" style={{ marginTop: 12 }}>— Pas d’ordonnance —</p>
                )}
              </div>
            )}
          </div>
        );
      })}
          </>
      )}
    </div>
  );
}