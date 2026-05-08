import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import rendezvousService from "../services/rendezvousService";
import { extractApiError } from "../utils/format";
import RendezVousForm from "../components/rendezvous/RendezVousForm";
import Modal from "../components/Modal";
import userService from "../services/userService";

const DEFAULT_FILTERS = {
  statut: "",
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
      if (filters.statut) params.statut = filters.statut;
      if (filters.patient) params.patient = filters.patient;
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
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.page, filters.statut, filters.patient, filters.q]);

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
  
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label>Statut</label>
              <select
                style={{ width: "100%" }}
                value={filters.statut}
                onChange={(e) => setFilters((s) => ({ ...s, statut: e.target.value, page: 1 }))}
              >
                <option value="">Tous</option>
                <option value="planifie">Planifié</option>
                <option value="annule">Annulé</option>
                <option value="termine">Terminé</option>
              </select>
            </div>
  
            <div>
            <label>Patient (nom/prénom)</label>
            <input
              style={{ width: "100%" }}
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value, page: 1 }))}
            />
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
                    <th>Motif</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((rdv) => (
                    <tr key={rdv.id}>
                      <td>{rdv.date || ""} {rdv.heure || ""} {(rdv.date_heure && new Date(rdv.date_heure).toLocaleString()) || ""}</td>
                      <td>
                        <span className={`badge ${rdv.statut === "termine" || rdv.statut_effectif === "termine" ? "badge-success" : rdv.statut === "annule" || rdv.statut_effectif === "annule" ? "badge-error" : "badge-warning"}`}>
                          {rdv.statut_effectif || rdv.statut}
                        </span>
                      </td>
                      <td>{rdv.patient_nom || ""} {rdv.patient_prenom || ""}</td>
                      <td>{rdv.motif || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link to={`/patients/${rdv.patient}`} style={{
                          background: "var(--bg-color)", padding: "6px 16px", borderRadius: "2rem",
                          fontSize: "0.85rem", fontWeight: 600
                        }}>Patient →</Link>
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