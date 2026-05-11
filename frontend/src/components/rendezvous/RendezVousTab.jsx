import React, { useEffect, useState } from "react";
import rendezvousService from "../../services/rendezvousService";
import { extractApiError } from "../../utils/format";
import Modal from "../Modal";
import RendezVousForm from "./RendezVousForm";

export default function RendezVousTab({ patientId, canCreate }) {
  const [items, setItems] = useState([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    load();
  }, [patientId]);

  const handleCreated = () => {
    setModalOpen(false);
    load();
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

  return (
    <>
      <div className="card border border-gray-100 shadow-sm mt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-3 text-gray-800">
            <i className="fa-regular fa-calendar-check text-primary"></i>
            Rendez-vous
          </h2>

          <div className="flex gap-3">
            {canCreate ? (
              <button 
                type="button" 
                onClick={() => setModalOpen(true)}
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
              >
                <i className="fa-solid fa-plus"></i>
                Nouveau RDV
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
                    <th>Date & Heure</th>
                    <th>Statut</th>
                    <th>Motif</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((rdv) => (
                    <tr key={rdv.id}>
                      <td>{new Date(rdv.date_heure).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${
                          (rdv.statut_effectif || rdv.statut) === 'termine' ? 'badge-success' : 
                          (rdv.statut_effectif || rdv.statut) === 'annule' ? 'badge-error' : 'badge-warning'
                        }`}>
                          {(rdv.statut_effectif || rdv.statut) === 'termine' ? 'Terminé' : 
                           (rdv.statut_effectif || rdv.statut) === 'annule' ? 'Annulé' : 'Planifié'}
                        </span>
                      </td>
                      <td>{rdv.motif || "—"}</td>
                      <td>
                        {canCreate && (rdv.statut_effectif || rdv.statut) === "planifie" ? (
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setModalOpen(false)} 
        title="Nouveau Rendez-vous"
        maxWidth="max-w-2xl"
      >
        <RendezVousForm 
          fixedPatientId={patientId}
          onSuccess={handleCreated} 
        />
      </Modal>
    </>
  );
}