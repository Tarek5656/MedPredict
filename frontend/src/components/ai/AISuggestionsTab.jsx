import React, { useState, useEffect } from "react";
import api from "../../services/api";
import "./AIStyles.css";

export default function AISuggestionsTab({ symptomsText, patient }) {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (symptomsText && symptomsText.trim().length > 2) {
        runAnalysis();
      } else {
        setResults(null);
      }
    }, 600); // Debounce pour éviter trop de requêtes
    return () => clearTimeout(timer);
  }, [symptomsText]);

  const runAnalysis = () => {
    setLoading(true);
    setError("");
    
    const symptomsList = symptomsText.split(",").map(s => s.trim()).filter(s => s);
    
    // Calcul de l'âge
    let age = 35;
    if (patient?.date_naissance) {
      age = new Date().getFullYear() - new Date(patient.date_naissance).getFullYear();
    }
    const gender = patient?.sexe === "M" ? "M" : "F";

    api.post("/consultations/ai-predict/", {
      symptoms: symptomsList,
      age: age,
      gender: gender
    })
    .then((res) => {
      setResults(res.data);
      setLoading(false);
    })
    .catch((err) => {
      console.error("AI Error:", err);
      setError("Le service d'analyse est indisponible.");
      setLoading(false);
    });
  };

  return (
    <div style={{ height: "100%" }}>
      <h3 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
        Résultats
      </h3>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 0" }}>
          <i className="fas fa-spinner fa-spin" style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: 12 }}></i>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>Analyse en cours...</p>
        </div>
      )}

      {error && (
        <div style={{ padding: 16, backgroundColor: "#fff5f5", color: "#c53030", borderRadius: 12, fontSize: "0.9rem" }}>
          <i className="fas fa-exclamation-circle" style={{ marginRight: 8 }}></i>
          {error}
        </div>
      )}

      {results && !loading && (
        <div className="animate-fade-in">
          {results.unknown_symptoms?.length > 0 && (
            <div style={{ marginBottom: 20, padding: 12, backgroundColor: "#fef2f2", borderRadius: 8, border: "1px solid #fee2e2" }}>
              <p style={{ fontSize: "0.8rem", color: "#991b1b", fontWeight: 600, marginBottom: 4 }}>Inconnus :</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {results.unknown_symptoms.map(s => (
                  <span key={s} style={{ fontSize: "0.75rem", color: "#991b1b", backgroundColor: "#fff", padding: "1px 6px", borderRadius: 4, border: "1px solid #fecaca" }}>{s}</span>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {results.suggestions?.map((item, index) => {
              const probPercent = Math.round(item.probability * 100);
              return (
                <div key={index} style={{ paddingBottom: 12, borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.disease}</span>
                    <span style={{ fontWeight: 700, color: "var(--primary)", fontSize: "0.95rem" }}>{probPercent}%</span>
                  </div>
                  <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 10, overflow: "hidden" }}>
                    <div 
                      style={{ 
                        width: `${probPercent}%`, 
                        height: "100%", 
                        backgroundColor: "var(--primary)",
                        transition: "width 0.5s ease-out"
                      }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && !results && !error && (
        <div style={{ textAlign: "center", padding: "60px 0", opacity: 0.5 }}>
          <i className="fas fa-wave-square" style={{ fontSize: "2rem", marginBottom: 12 }}></i>
          <p style={{ fontSize: "0.9rem" }}>En attente de symptômes...</p>
        </div>
      )}
    </div>
  );
}