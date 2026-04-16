import React, { useEffect, useState } from "react";
import rendezvousService from "../../services/rendezvousService";
import { extractApiError } from "../../utils/format";

export default function RendezVousTab({ patientId, canCreate }) {
  const [items, setItems] = useState([]);
  const [formExpanded, setFormExpanded] = useState(false);

  const [form, setForm] = useState({
    date_heure: "",
    duree_minutes: 30,
    motif: "",
    statut: "planifie",
  });

  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await rendezvousService.getAll({ patient: patientId });
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setItems(data);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (![15, 30].includes(Number(form.duree_minutes))) {
      setForm((s) => ({ ...s, duree_minutes: 30 }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.duree_minutes]);

  useEffect(() => {
    load();
  }, [patientId]);

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
    if (!confirm("Annuler ce rendez-vous ?")) return;
    setErr(null);
    try {
      await rendezvousService.annuler(rdvId);
      await load();
    } catch (e) {
      setErr(extractApiError(e));
    }
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
    <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h3 style={{ margin: 0 }}>Rendez-vous</h3>

        {canCreate ? (
          <button type="button" onClick={() => setFormExpanded((v) => !v)}>
            {formExpanded ? "Réduire" : "Nouveau RDV"}
          </button>
        ) : null}

        <button style={{ marginLeft: "auto" }} onClick={load} disabled={loading}>
          Rafraîchir
        </button>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      {!canCreate ? (
        <p style={{ opacity: 0.7, marginTop: 6 }}>
          Tu n’as pas les droits pour créer/modifier les rendez-vous.
        </p>
      ) : null}

      {/* ✅ Formulaire repliable */}
      {canCreate && formExpanded ? (
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
          <p>— Aucun rendez-vous —</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                  Id
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                  Date
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                  Statut
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                  Motif
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {items.map((rdv) => (
                <tr key={rdv.id}>
                  <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                    {rdv.id || "—"}
                  </td>

                  <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                    {new Date(rdv.date_heure).toLocaleString()}
                  </td>

                  <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                    {rdv.statut_effectif || rdv.statut}
                  </td>

                  <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                    {rdv.motif || "—"}
                  </td>

                  <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                    {canCreate && (rdv.statut_effectif || rdv.statut) === "planifie" ? (
                      <button onClick={() => cancelRdv(rdv.id)}>Annuler</button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}