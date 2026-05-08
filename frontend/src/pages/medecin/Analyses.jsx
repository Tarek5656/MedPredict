import React, { useState } from "react";
import SymptomesTab from "../../components/ai/SymptomesTab";
import AISuggestionsTab from "../../components/ai/AISuggestionsTab";
import "../../components/ai/AIStyles.css";

export default function Analyses() {
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [symptomsText, setSymptomsText] = useState("");

  const handleSymptomToggle = (codes) => {
    setSelectedCodes(codes);
    setSymptomsText(codes.join(", "));
  };

  return (
    <div className="page-container animate-fade-in">
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "var(--text-dark)", marginBottom: 8 }}>
          Analyses
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          Gestion et analyse des symptômes cliniques.
        </p>
      </div>

      <div className="card" style={{ padding: 24, marginBottom: 32 }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>Symptômes</h3>
          {selectedCodes.length > 0 && (
            <button 
              onClick={() => {
                setSelectedCodes([]);
                setSymptomsText("");
              }}
              style={{ 
                border: "1px solid #fee2e2", 
                backgroundColor: "#fef2f2", 
                color: "#b91c1c", 
                padding: "4px 12px", 
                borderRadius: 8, 
                fontSize: "0.8rem", 
                fontWeight: 600, 
                cursor: "pointer" 
              }}
            >
              Effacer tout
            </button>
          )}
        </div>
        
        <textarea
          value={symptomsText}
          onChange={(e) => {
            setSymptomsText(e.target.value);
            // On tente de synchroniser selectedCodes si possible
            const typed = e.target.value.split(",").map(s => s.trim()).filter(s => s);
            setSelectedCodes(typed);
          }}
          placeholder="Saisissez les symptômes..."
          style={{ 
            width: "100%", 
            height: 80, 
            padding: 16, 
            backgroundColor: "#f8fafc", 
            border: "1px solid #e2e8f0", 
            borderRadius: 12,
            fontSize: "0.95rem",
            fontFamily: "monospace",
            resize: "none",
            marginBottom: selectedCodes.length > 0 ? 16 : 0
          }}
        />

        {selectedCodes.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {selectedCodes.map((code) => (
              <div 
                key={code}
                style={{ 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 6, 
                  backgroundColor: "var(--primary-light)", 
                  color: "var(--primary)", 
                  padding: "4px 10px", 
                  borderRadius: 20,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  border: "1px solid var(--primary-border)"
                }}
              >
                {code}
                <button 
                  onClick={() => {
                    const next = selectedCodes.filter(c => c !== code);
                    setSelectedCodes(next);
                    setSymptomsText(next.join(", "));
                  }}
                  style={{ 
                    border: "none", 
                    background: "none", 
                    color: "var(--primary)", 
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    fontSize: "1rem",
                    lineHeight: 1
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32 }}>
        <div className="card" style={{ padding: 24 }}>
          <SymptomesTab
            selectedCodes={selectedCodes}
            onToggle={handleSymptomToggle}
          />
        </div>

        <div className="card" style={{ padding: 24, height: "fit-content", position: "sticky", top: 20 }}>
          <AISuggestionsTab symptomsText={symptomsText} />
        </div>
      </div>
    </div>
  );
}
