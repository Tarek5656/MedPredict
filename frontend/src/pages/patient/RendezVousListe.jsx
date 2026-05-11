import React, { useEffect, useState } from "react";
import rendezvousService from "../../services/rendezvousService";
import { extractApiError } from "../../utils/format";
import Modal from "../../components/Modal";
import RendezVousForm from "../../components/rendezvous/RendezVousForm";

export default function RendezVousListe() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await rendezvousService.me();
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      setItems(data.sort((a, b) => new Date(b.date_heure) - new Date(a.date_heure)));
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreated = () => {
    setIsModalOpen(false);
    load();
  };

  const cancelRdv = async (rdvId) => {
    // Calculer le nombre d'annulations ce mois-ci
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const cancelsThisMonth = items.filter(rdv => {
      const isAnnule = (rdv.statut_effectif || rdv.statut) === 'annule';
      if (!isAnnule) return false;
      
      // On se base sur la date de mise à jour ou de création si disponible
      // Pour faire simple, on vérifie si le RDV annulé était prévu ce mois-ci
      const rdvDate = new Date(rdv.date_heure);
      return rdvDate.getMonth() === currentMonth && rdvDate.getFullYear() === currentYear;
    }).length;

    let confirmMsg = "Voulez-vous vraiment annuler ce rendez-vous ?";
    if (cancelsThisMonth === 1) {
      confirmMsg = "Attention : Ceci est votre 2ème annulation ce mois-ci. Vous ne pourrez plus annuler de rendez-vous après celui-ci jusqu'au mois prochain. Confirmer ?";
    }

    if (!window.confirm(confirmMsg)) return;
    
    setErr(null);
    try {
      await rendezvousService.annuler(rdvId);
      await load();
    } catch (e) {
      setErr(extractApiError(e));
    }
  };

  return (
    <div className="card border border-gray-100 shadow-sm mt-8 animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-3 text-gray-800">
          <i className="fa-regular fa-calendar-check text-primary"></i>
          Mes Rendez-vous
        </h2>

        <div className="flex gap-3">
          <button 
            type="button" 
            onClick={() => setIsModalOpen(true)}
            className="bg-[var(--primary)] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-green-100 hover:scale-105 transition-all flex items-center gap-2"
          >
            <i className="fa-solid fa-plus"></i>
            Demander un rendez-vous
          </button>

          <button 
            onClick={load} 
            disabled={loading}
            className="outline"
            style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? "fa-spin" : ""}`}></i>
            Actualiser
          </button>
        </div>
      </div>

      {err && <div className="badge badge-error w-full p-4 mb-6">{err}</div>}

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="overflow-hidden">
          {items.length === 0 ? (
            <div className="p-16 text-center text-gray-500 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
              <i className="fa-regular fa-calendar-xmark text-4xl mb-4 opacity-20"></i>
              <p className="text-lg font-medium text-gray-400">Vous n'avez aucun rendez-vous planifié.</p>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="text-primary font-bold mt-4 hover:underline"
              >
                Prendre mon premier rendez-vous →
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date & Heure</th>
                    <th>Statut</th>
                    <th>Médecin</th>
                    <th>Motif</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((rdv) => (
                    <tr key={rdv.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="font-medium text-gray-900">
                        {new Date(rdv.date_heure).toLocaleString('fr-FR', { 
                          weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' 
                        })}
                      </td>
                      <td>
                        <span className={`badge ${
                          (rdv.statut_effectif || rdv.statut) === 'termine' ? 'badge-success' : 
                          (rdv.statut_effectif || rdv.statut) === 'annule' ? 'badge-error' : 
                          (rdv.statut_effectif || rdv.statut) === 'en_attente' ? 'bg-orange-100 text-orange-700' :
                          'badge-warning'
                        }`}>
                          {(rdv.statut_effectif || rdv.statut) === 'termine' ? 'Terminé' : 
                           (rdv.statut_effectif || rdv.statut) === 'annule' ? 'Annulé' : 
                           (rdv.statut_effectif || rdv.statut) === 'en_attente' ? 'En attente de validation' : 'Planifié'}
                        </span>
                      </td>
                      <td className="font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">
                            <i className="fa-solid fa-user-doctor"></i>
                          </div>
                          Dr. {rdv.medecin_nom || "Yahyaoui"}
                        </div>
                      </td>
                      <td className="text-gray-500">{rdv.motif || "—"}</td>
                      <td className="text-right">
                        {(rdv.statut_effectif || rdv.statut) === "planifie" ? (
                          <button 
                            className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all"
                            onClick={() => cancelRdv(rdv.id)}
                          >
                            Annuler
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* MODALE DE PRISE DE RENDEZ-VOUS (Même composant que la secrétaire) */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Prendre un nouveau rendez-vous"
        maxWidth="max-w-2xl"
      >
        <div className="py-4">
            <RendezVousForm onSuccess={handleCreated} />
        </div>
      </Modal>
    </div>
  );
}