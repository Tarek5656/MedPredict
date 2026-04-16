import React, { useEffect, useState } from "react";
import rendezvousService from "../../services/rendezvousService";
import { extractApiError } from "../../utils/format";

export default function RendezVousListe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await rendezvousService.me();
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

  if (loading && items.length === 0) return <p style={{ padding: 12 }}>Chargement...</p>;
  if (err) return <p style={{ color: "crimson", padding: 12 }}>{err}</p>;

  return (
    <div className="page-container animate-fade-in">
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Id</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Date</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Statut</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Motif</th>
            <th style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb", padding: 8 }}>Actions</th>
          </tr>
        </thead>

        <tbody>
          {items.map((rdv) => (
            <tr key={rdv.id}>
              <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>{rdv.id || "—"}</td>

              <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                {rdv.date_heure ? new Date(rdv.date_heure).toLocaleString() : "—"}
              </td>

              <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                {rdv.statut_effectif || rdv.statut}
              </td>

              <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>{rdv.motif || "—"}</td>

              <td style={{ borderBottom: "1px solid #f3f4f6", padding: 8 }}>
                {canCancel(rdv) ? (
                  <button type="button" onClick={() => cancelRdv(rdv.id)}>
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
  );
}