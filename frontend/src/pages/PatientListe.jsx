import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import patientService from "../services/patientService";
import { extractApiError } from "../utils/format";
import SlideDrawer from "../components/SlideDrawer";
import PatientForm from "../components/patient/PatientForm";
import userService from "../services/userService";

const DEFAULT_FILTERS = {
  id: "",
  telephone: "",
  email: "",
  nom: "",
  prenom: "",
  page: 1,
};

export default function PatientsList() {
  const [patients, setPatients] = useState([]);
  const [count, setCount] = useState(0);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

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
      const [meRes] = await Promise.all([
        userService.me(),
      ]);

      setMe(meRes.data);

      if (filters.id) params.id = filters.id;
      if (filters.telephone) params.telephone = filters.telephone;
      if (filters.email) params.email = filters.email;
      if (filters.nom) params.nom = filters.nom;
      if (filters.prenom) params.prenom = filters.prenom;

      const res = await patientService.getAll(params);

      // ✅ DRF pagination: next/previous
      if (res.data && typeof res.data === "object" && Array.isArray(res.data.results)) {
        setPatients(res.data.results);
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
        setPatients(data);
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
  }, [filters.page, filters.id, filters.telephone, filters.email, filters.nom, filters.prenom]);

  return (
      <div className="page-container animate-fade-in">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Patients</h1>
          <span className="badge badge-success" style={{ padding: '0.4rem 1rem' }}>Total: {count}</span>
  
          {(isAdmin || isSecretaire) ? (
            <div style={{ marginLeft: "auto", display: "flex", gap: 12, alignItems: "center" }}>
              <button onClick={() => setDrawerOpen(true)}>
                <i className="fa-solid fa-plus"></i>
                Nouveau patient
              </button>
            </div>
          ) : null}
        </div>
  
        {err && <p className="badge badge-error w-full p-4 mb-4">{err}</p>}
  
        {/* ✅ Même style que la page RDV + bouton réinitialiser */}
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
  
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <div>
              <label>Patient (ID)</label>
              <input
                style={{ width: "100%" }}
                value={filters.id}
                onChange={(e) => setFilters((s) => ({ ...s, id: e.target.value, page: 1 }))}
                placeholder="ex: 4"
              />
            </div>
  
            <div>
              <label>Téléphone</label>
              <input
                style={{ width: "100%" }}
                value={filters.telephone}
                onChange={(e) => setFilters((s) => ({ ...s, telephone: e.target.value, page: 1 }))}
                placeholder="ex: 0612345678"
              />
            </div>
  
            <div>
              <label>Email</label>
              <input
                style={{ width: "100%" }}
                value={filters.email}
                onChange={(e) => setFilters((s) => ({ ...s, email: e.target.value, page: 1 }))}
                placeholder="ex: a@b.com"
              />
            </div>
  
            <div>
              <label>Nom</label>
              <input
                style={{ width: "100%" }}
                value={filters.nom}
                onChange={(e) => setFilters((s) => ({ ...s, nom: e.target.value, page: 1 }))}
                placeholder="ex: Charfi"
              />
            </div>
  
            <div>
              <label>Prénom</label>
              <input
                style={{ width: "100%" }}
                value={filters.prenom}
                onChange={(e) => setFilters((s) => ({ ...s, prenom: e.target.value, page: 1 }))}
                placeholder="ex: Ahmed"
              />
            </div>
          </div>
        </div>
  
        <div style={{ marginTop: 12 }}>
          {loading ? <p>Chargement...</p> : null}
  
          {patients.length === 0 ? (
            <p>— Aucun patient —</p>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Prénom</th>
                    <th>Téléphone</th>
                    <th>Email</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td>#{p.id}</td>
                      <td style={{ fontWeight: 600 }}>{p.nom}</td>
                      <td>{p.prenom}</td>
                      <td>{p.telephone || "—"}</td>
                      <td>{p.email || "—"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link to={`/patients/${p.id}`} style={{
                          background: "var(--bg-color)", padding: "6px 16px", borderRadius: "2rem",
                          fontSize: "0.85rem", fontWeight: 600
                        }}>Détail →</Link>
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
  
        <SlideDrawer isOpen={isDrawerOpen} onClose={() => setDrawerOpen(false)} title="Nouveau Patient">
          <PatientForm onSuccess={handleCreated} />
        </SlideDrawer>
      </div>
    );
}