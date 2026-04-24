import React, { useEffect, useState } from "react";
import rendezvousService from "../../services/rendezvousService";
import patientService from "../../services/patientService";
import { extractApiError } from "../../utils/format";

export default function RendezVousListe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [formExpanded, setFormExpanded] = useState(false);
  const [patientId, setPatientId] = useState(null);
  const [creating, setCreating] = useState(false);

  const [form, setForm] = useState({
      date_heure: "",
      duree_minutes: 30,
      motif: "",
      statut: "planifie",
    });

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await rendezvousService.me();
      const pRes = await patientService.me();
      setPatientId(pRes.data.id);

      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setItems(data);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createRdv = async (e) => {
    e.preventDefault();
    setErr(null);
    setCreating(true);
    try {
      if (!form.date_heure) throw new Error("Choisis une date/heure.");

      await rendezvousService.create({
        patient: Number(patientId),
        date_heure: form.date_heure,
        duree_minutes: Number(form.duree_minutes),
        motif: form.motif,
        statut: form.statut,
      });

      setForm({ date_heure: "", duree_minutes: 30, motif: "", statut: "planifie" });
      setFormExpanded(false); // ✅ refermer après création (optionnel)
      await load();
    } catch (e2) {
      setErr(extractApiError(e2));
    } finally {
      setCreating(false);
    }
  };

  const cancelRdv = async (rdvId) => {
    if (!window.confirm("Annuler ce rendez-vous ?")) return;
    setErr(null);
    try {
      await rendezvousService.annuler(rdvId);
      await load();
    } catch (e) {
      setErr(extractApiError(e));
    }
  };

  const canCancel = (rdv) => {
    const statut = rdv.statut_effectif || rdv.statut;
    return statut === "planifie";
  };

  const resetForm = () => {
    setErr(null);
    setForm({
      date_heure: "",
      duree_minutes: 30,
      motif: "",
      statut: "planifie",
    });
    setFormExpanded(false);
  };

  return (
    <div className="card border border-gray-100 shadow-sm mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800">
          <i className="fa-regular fa-calendar-check text-primary"></i>
          Rendez-vous
        </h2>

        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={() => setFormExpanded((v) => !v)}
            className={formExpanded ? "outline" : ""}
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
          >
            <i className={`fa-solid ${formExpanded ? "fa-minus" : "fa-plus"}`}></i>
            {formExpanded ? "Réduire" : "Nouveau RDV"}
          </button>

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

      {/* ✅ Formulaire repliable */}
      {formExpanded ? (
        <form onSubmit={createRdv} style={{ marginTop: 10, display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label>Date / heure</label>
              <input
                type="datetime-local"
                style={{ width: "100%" }}
                value={form.date_heure}
                onChange={(e) => setForm((s) => ({ ...s, date_heure: e.target.value }))}
              />
            </div>

            <div>
              <label>Durée (minutes)</label>
              <select
                style={{ width: "100%" }}
                value={String(form.duree_minutes ?? 30)}
                onChange={(e) => setForm((s) => ({ ...s, duree_minutes: Number(e.target.value) }))}
              >
                <option value="15">15 min</option>
                <option value="30">30 min</option>
              </select>
            </div>
          </div>

          <div>
            <label>Motif</label>
            <input
              style={{ width: "100%" }}
              value={form.motif}
              onChange={(e) => setForm((s) => ({ ...s, motif: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button disabled={creating}>{creating ? "Création..." : "Créer RDV"}</button>

            <button type="button" onClick={resetForm} disabled={creating}>
              Annuler
            </button>
          </div>
        </form>
      ) : null}

      {loading ? <p>Chargement...</p> : null}

      <div style={{ marginTop: 10 }}>
        {items.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <i className="fa-regular fa-calendar-times text-3xl mb-3 opacity-20"></i>
            <p className="font-medium text-gray-400">Aucun rendez-vous planifié pour ce patient.</p>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date & Heure</th>
                  <th>Statut</th>
                  <th>Motif</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {items.map((rdv) => (
                  <tr key={rdv.id}>
                    <td>#{rdv.id}</td>
                    <td>{new Date(rdv.date_heure).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${
                        (rdv.statut_effectif || rdv.statut) === 'termine' ? 'badge-success' : 
                        (rdv.statut_effectif || rdv.statut) === 'annule' ? 'badge-error' : 'badge-warning'
                      }`}>
                        {rdv.statut_effectif || rdv.statut}
                      </span>
                    </td>
                    <td>{rdv.motif || "—"}</td>
                    <td>
                      {(rdv.statut_effectif || rdv.statut) === "planifie" ? (
                        <button 
                          className="danger" 
                          style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}
                          onClick={() => cancelRdv(rdv.id)}
                        >
                          Annuler
                        </button>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}