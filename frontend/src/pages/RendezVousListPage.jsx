import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import rendezvousService from "../services/rendezvousService";
import { extractApiError } from "../utils/format";
import RendezVousForm from "../components/rendezvous/RendezVousForm";
import SlideDrawer from "../components/SlideDrawer";
import userService from "../services/userService";

const DEFAULT_FILTERS = {
  statut: "",
  patient: "",
  q: "",
  page: 1,
};

export default function RendezVousListPage() {
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

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
    setDrawerOpen(false);
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
          <h1 style={{ margin: 0, fontSize: "2rem", color: "var(--primary)", letterSpacing: "-0.02em" }}>Rendez-vous</h1>
          <span style={{ opacity: 0.7 }}>Total: {count}</span>

          {(isAdmin || isSecretaire) ? (
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={() => setDrawerOpen(true)} style={{
                background: "var(--primary)", color: "white", padding: "10px 24px", borderRadius: "9999px", fontWeight: 600, fontSize: "0.875rem", border: "none", cursor: "pointer"
              }}>+ Nouveau rendez-vous</button>
            </div>
          ) : null}
        </div>
  
        {err && <p style={{ color: "crimson" }}>{err}</p>}
  
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h3 style={{ marginTop: 0, marginBottom: 0 }}>Filtres</h3>
  
            <div style={{ marginLeft: "auto", display: "flex", gap: 12 }}>
              <button onClick={load} disabled={loading}>
                Rafraîchir
              </button>
              <button
                type="button"
                onClick={resetFilters}
                disabled={loading}
                title="Réinitialiser les filtres"
              >
                Réinitialiser
              </button>
            </div>
          </div>
  
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
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
              <label>Patient (ID)</label>
              <input
                style={{ width: "100%" }}
                value={filters.patient}
                onChange={(e) => setFilters((s) => ({ ...s, patient: e.target.value, page: 1 }))}
                placeholder="ex: 4"
              />
            </div>
            <div>
            <label>Patient (nom/prénom)</label>
            <input
              style={{ width: "100%" }}
              value={filters.q}
              onChange={(e) => setFilters((s) => ({ ...s, q: e.target.value, page: 1 }))}
              placeholder="ex: charf tarek"
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
                    <th>Id</th>
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
                      <td style={{ fontWeight: 600 }}>{rdv.id || "—"}</td>
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

        <SlideDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} title="Nouveau Rendez-vous">
          <RendezVousForm onSuccess={handleCreated} />
        </SlideDrawer>
      </div>
    );
}