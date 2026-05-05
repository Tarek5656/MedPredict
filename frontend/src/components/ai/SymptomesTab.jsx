import React, { useEffect, useState } from "react";
import api from "../../services/api";

export default function SymptomesTab({ selectedCodes, onToggle }) {
  const [symptoms, setSymptoms] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  useEffect(() => {
    fetchSymptoms();
  }, [page, search]);

  const fetchSymptoms = () => {
    setLoading(true);
    // On utilise l'API Django qui gère la recherche et la pagination
    api.get(`/symptoms/?page=${page}&search=${search}`)
      .then((res) => {
        setSymptoms(res.data.results || []);
        setCount(res.data.count || 0);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching symptoms:", err);
        setLoading(false);
      });
  };

  const handleCheck = (code) => {
    const next = selectedCodes.includes(code)
      ? selectedCodes.filter((c) => c !== code)
      : [...selectedCodes, code];
    onToggle(next);
  };

  const totalPages = Math.ceil(count / 10);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
          Symptômes <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: "0.85rem" }}>{count} total</span>
        </h3>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          Sélectionnés : <strong>{selectedCodes.length}</strong>
        </span>
      </div>

      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <div style={{ position: "relative", flex: 1 }}>
          <i className="fas fa-search" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontSize: "0.9rem" }}></i>
          <input
            type="text"
            placeholder="Rechercher (ex: rash, headache...)"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ 
              width: "100%", 
              padding: "10px 12px 10px 36px", 
              borderRadius: 10, 
              border: "1px solid #e2e8f0",
              fontSize: "0.9rem"
            }}
          />
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 320, position: "relative" }}>
        <div 
          style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: 4, 
            opacity: loading ? 0.5 : 1,
            transition: "opacity 0.2s ease-in-out",
            pointerEvents: loading ? "none" : "auto"
          }}
        >
          {symptoms.map((s) => (
            <label 
              key={s.code} 
              style={{ 
                display: "flex", 
                alignItems: "center", 
                gap: 12, 
                padding: "8px 12px", 
                borderRadius: 8, 
                cursor: "pointer",
                backgroundColor: selectedCodes.includes(s.code) ? "#f0fdfa" : "transparent",
                transition: "background 0.2s"
              }}
              className="hover-bg-slate"
            >
              <input
                type="checkbox"
                checked={selectedCodes.includes(s.code)}
                onChange={() => handleCheck(s.code)}
                style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "0.9rem", color: "var(--text-dark)" }}>
                {s.label || s.code}
              </span>
            </label>
          ))}
          {!loading && symptoms.length === 0 && (
            <p style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Aucun symptôme trouvé.
            </p>
          )}
        </div>

        {loading && (
          <div style={{ 
            position: "absolute", 
            top: "50%", 
            left: "50%", 
            transform: "translate(-50%, -50%)",
            zIndex: 1
          }}>
            <i className="fas fa-spinner fa-spin" style={{ color: "var(--primary)", fontSize: "1.2rem" }}></i>
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: 20, 
        paddingTop: 20, 
        borderTop: "1px solid #f1f5f9",
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        gap: 16 
      }}>
        <button 
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || loading}
          style={{ 
            padding: "6px 16px", 
            borderRadius: 8, 
            border: "1px solid #e2e8f0", 
            backgroundColor: "white",
            cursor: page === 1 ? "default" : "pointer",
            opacity: page === 1 ? 0.3 : 1,
            fontSize: "1rem",
            fontWeight: "bold",
            color: "var(--primary)"
          }}
        >
          &larr;
        </button>
        
        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Page {page} <span style={{ fontWeight: 400, color: "#94a3b8" }}>sur {totalPages || 1}</span>
        </span>

        <button 
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={page === totalPages || loading}
          style={{ 
            padding: "6px 16px", 
            borderRadius: 8, 
            border: "1px solid #e2e8f0", 
            backgroundColor: "white",
            cursor: page === totalPages ? "default" : "pointer",
            opacity: page === totalPages ? 0.3 : 1,
            fontSize: "1rem",
            fontWeight: "bold",
            color: "var(--primary)"
          }}
        >
          &rarr;
        </button>
      </div>
    </div>
  );
}
