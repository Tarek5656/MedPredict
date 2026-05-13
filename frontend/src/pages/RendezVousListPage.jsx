import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import rendezvousService from "../services/rendezvousService";
import { extractApiError } from "../utils/format";
import RendezVousForm from "../components/rendezvous/RendezVousForm";
import Modal from "../components/Modal";
import userService from "../services/userService";

const DEFAULT_FILTERS = {
  statut: [], 
  medecin: [], // Multi-sélection médecins
  q: "",
  page: 1,
};

export default function RendezVousListPage() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [isModalOpen, setModalOpen] = useState(false);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [loading, setLoading] = useState(false);
  const [medecins, setMedecins] = useState([]);
  const [err, setErr] = useState(null);

  const [me, setMe] = useState(null);
  const isMedecin = (me?.groups || []).includes("MEDECIN");
  const isSecretaire = (me?.groups || []).includes("SECRETAIRE");
  const isSuperuser = !!me?.is_superuser;
  const isAdmin = isSuperuser || (me?.groups || []).includes("ADMIN");

  const handleCreated = () => {
    setModalOpen(false);
    load();
  };

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const params = { page: filters.page };
      if (filters.statut.length > 0) {
        // On envoie les statuts séparés par des virgules
        params.statut = filters.statut.join(",");
      }
      if (filters.medecin.length > 0) {
        params.medecin = filters.medecin.join(",");
      }
      if (filters.q) params.q = filters.q;

      const [meRes] = await Promise.all([
        userService.me(),
      ]);

      setMe(meRes.data);

      const res = await rendezvousService.getAll(params);

      // ✅ DRF pagination: next/previous
      if (res.data && typeof res.data === "object" && Array.isArray(res.data.results)) {
        setItems(res.data.results);
        setCount(res.data.count ?? 0);
        setHasNext(!!res.data.next);
        setHasPrev(!!res.data.previous);

        // optionnel: éviter rester sur une page vide (ex: page trop grande)
        if (res.data.results.length === 0 && res.data.previous) {
          setFilters((s) => ({ ...s, page: Math.max(1, s.page - 1) }));
        }
      } else {
        // non paginé
        const data = Array.isArray(res.data) ? res.data : [];
        setItems(data);
        setCount(data.length);
        setHasNext(false);
        setHasPrev(false);
      }
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchMedecins = async () => {
      try {
        const res = await userService.medecins();
        setMedecins(res.data || []);
      } catch (err) {
        console.error("Erreur chargement médecins", err);
      }
    };
    fetchMedecins();
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.statut, filters.medecin, filters.q]);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  return (
      <div className="page-container animate-fade-in">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Rendez-vous</h1>
          <span className="badge badge-success" style={{ padding: '0.4rem 1rem' }}>Total: {count}</span>
  
          {(isAdmin || isSecretaire) ? (
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
              <button 
                onClick={() => setModalOpen(true)}
                className="bg-[var(--primary)] text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-green-100 hover:scale-105 transition-all flex items-center gap-2"
              >
                <i className="fa-solid fa-plus"></i>
                Nouveau rendez-vous
              </button>
            </div>
          ) : null}
        </div>
  
        {err && <p className="badge badge-error w-full p-4 mb-4">{err}</p>}
  
        <div className="card shadow-sm border border-gray-100 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <i className="fa-solid fa-sliders text-primary"></i>
              Filtres
            </h3>
  
            <div className="flex gap-3">
              <button 
                onClick={load} 
                disabled={loading}
                className="outline"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
              >
                <i className={`fa-solid fa-arrows-rotate ${loading ? "fa-spin" : ""}`}></i>
                Rafraîchir
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={loading}
                className="outline"
                style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
                title="Réinitialiser les filtres"
              >
                <i className="fa-solid fa-xmark"></i>
                Réinitialiser
              </button>
            </div>
          </div>
  
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 12 }}>
            <div>
              <label style={{ marginBottom: '8px', display: 'block' }}>Filtrer par statut</label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {[
                  { id: 'en_attente', label: 'En attente', class: 'bg-orange-100 text-orange-700', activeClass: 'bg-orange-500 text-white' },
                  { id: 'planifie', label: 'Planifié', class: 'bg-blue-100 text-blue-700', activeClass: 'bg-blue-600 text-white' },
                  { id: 'termine', label: 'Terminé', class: 'bg-green-100 text-green-700', activeClass: 'bg-green-600 text-white' },
                  { id: 'annule', label: 'Annulé', class: 'bg-red-100 text-red-700', activeClass: 'bg-red-600 text-white' },
                ].map((s) => {
                  const isActive = filters.statut.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setFilters(prev => {
                          const newStatut = prev.statut.includes(s.id)
                            ? prev.statut.filter(id => id !== s.id)
                            : [...prev.statut, s.id];
                          return { ...prev, statut: newStatut, page: 1 };
                        });
                      }}
                      style={{ 
                        padding: '8px 16px', 
                        borderRadius: '999px', 
                        fontSize: '0.85rem', 
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                        opacity: filters.statut.length > 0 && !isActive ? 0.6 : 1
                      }}
                      className={isActive ? s.activeClass : s.class}
                    >
                      {s.label}
                      {isActive && <i className="fa-solid fa-check" style={{ marginLeft: '8px', fontSize: '0.75rem' }}></i>}
                    </button>
                  );
                })}
              </div>
            </div>
  
            {/* Filtrage par médecin : Visible pour Admin, Secrétaire ET Patient */}
            {(isAdmin || isSecretaire || !isMedecin) && medecins.length > 0 && (
              <div style={{ marginTop: '8px' }}>
                <label style={{ marginBottom: '8px', display: 'block' }}>Filtrer par médecin</label>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {medecins.map((m) => {
                    const isActive = filters.medecin.includes(String(m.id));
                    const displayName = m.first_name || m.last_name 
                      ? `Dr. ${m.first_name || ""} ${m.last_name || ""}`.trim() 
                      : `Dr. ${m.username}`;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setFilters(prev => {
                            const newMed = prev.medecin.includes(String(m.id))
                              ? prev.medecin.filter(id => id !== String(m.id))
                              : [...prev.medecin, String(m.id)];
                            return { ...prev, medecin: newMed, page: 1 };
                          });
                        }}
                        style={{ 
                          padding: '8px 16px', 
                          borderRadius: '999px', 
                          fontSize: '0.85rem', 
                          fontWeight: 600,
                          border: 'none',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: isActive ? '0 4px 12px rgba(0,0,0,0.1)' : 'none',
                          opacity: filters.medecin.length > 0 && !isActive ? 0.6 : 1
                        }}
                        className={isActive ? 'bg-blue-600 text-white' : 'bg-blue-50 text-blue-700'}
                      >
                        {displayName}
                        {isActive && <i className="fa-solid fa-check" style={{ marginLeft: '8px', fontSize: '0.75rem' }}></i>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
  
            {/* Recherche textuelle */}
            <div>
              <label>
                {(!isAdmin && !isSecretaire && !isMedecin) 
                  ? "Rechercher un médecin (nom/prénom)" 
                  : "Rechercher un patient (nom/prénom)"}
              </label>
              <div style={{ position: 'relative' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', opacity: 0.5 }}></i>
                <input
                  style={{ width: "100%", paddingLeft: '44px' }}
                  value={filters.q}
                  onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value, page: 1 }))}
                />
              </div>
            </div>
          </div>
        </div>
  
        <div style={{ marginTop: 12 }}>
          {loading ? <p>Chargement...</p> : null}
  
          {items.length === 0 ? (
            <p>— Aucun rendez-vous —</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Statut</th>
                    <th>Patient</th>
                    <th>Médecin</th>
                    <th>Motif</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((rdv) => (
                    <tr key={rdv.id}>
                      <td>{rdv.date || ""} {rdv.heure || ""} {(rdv.date_heure && new Date(rdv.date_heure).toLocaleString()) || ""}</td>
                      <td>
                        <span className={`badge ${
                          (rdv.statut_effectif || rdv.statut) === 'termine' ? 'badge-success' : 
                          (rdv.statut_effectif || rdv.statut) === 'annule' ? 'badge-error' : 
                          (rdv.statut_effectif || rdv.statut) === 'en_attente' ? 'bg-orange-100 text-orange-700' :
                          'badge-warning'
                        }`}>
                          {(rdv.statut_effectif || rdv.statut) === 'termine' ? 'Terminé' : 
                           (rdv.statut_effectif || rdv.statut) === 'annule' ? 'Annulé' : 
                           (rdv.statut_effectif || rdv.statut) === 'en_attente' ? 'En attente' : 'Planifié'}
                        </span>
                      </td>
                      <td>{rdv.patient_nom || ""} {rdv.patient_prenom || ""}</td>
                      <td className="font-semibold text-gray-700">Dr. {rdv.medecin_nom || ""}</td>
                      <td>{rdv.motif || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                          {(rdv.statut_effectif || rdv.statut) === "en_attente" && (isAdmin || isSecretaire) && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    await rendezvousService.approuver(rdv.id);
                                    load();
                                  } catch (e) {
                                    alert(extractApiError(e));
                                  }
                                }}
                                className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-600 transition-all"
                              >
                                Accepter
                              </button>
                              <button
                                onClick={async () => {
                                  if (!window.confirm("Refuser cette demande ?")) return;
                                  try {
                                    await rendezvousService.refuser(rdv.id);
                                    load();
                                  } catch (e) {
                                    alert(extractApiError(e));
                                  }
                                }}
                                className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-700 transition-all"
                              >
                                Refuser
                              </button>
                            </>
                          )}
                          <Link to={`/patients/${rdv.patient}`} style={{
                            background: "var(--bg-color)", padding: "6px 16px", borderRadius: "2rem",
                            fontSize: "0.85rem", fontWeight: 600
                          }}>Patient →</Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
  
          {/* ✅ Pagination (bloque pages invalides) */}
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              disabled={loading || !hasPrev}
              onClick={() => setFilters((s) => ({ ...s, page: Math.max(1, s.page - 1) }))}
            >
              ← Précédent
            </button>
            <span style={{ alignSelf: "center" }}>Page {filters.page}</span>
            <button
              disabled={loading || !hasNext}
              onClick={() => setFilters((s) => ({ ...s, page: s.page + 1 }))}
            >
              Suivant →
            </button>
          </div>
        </div>

        <Modal 
          isOpen={isModalOpen} 
          onClose={() => setModalOpen(false)} 
          title="Nouveau Rendez-vous"
          maxWidth="max-w-2xl"
        >
          <RendezVousForm onSuccess={handleCreated} />
        </Modal>
      </div>
    );
}