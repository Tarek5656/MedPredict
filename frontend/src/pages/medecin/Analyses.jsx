import React, { useState } from "react";
import SymptomesTab from "../../components/symptome/SymptomesTab";
import AISuggestionsTab from "../../components/ai/AISuggestionsTab";

export default function Analyses() {
  const [selectedCodes, setSelectedCodes] = useState([]);
  const [symptomsText, setSymptomsText] = useState("");

  const applySelectedToText = (codes) => {
    // Mets directement les tokens IA attendus
    setSymptomsText(codes.join(", "));
  };

  return (
    <div className="page-container animate-fade-in">
      <h2>Analyses</h2>

      <div className="card" style={{ padding: 16 }}>
        <label style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
          Symptômes (tokens)
        </label>
        <textarea
          value={symptomsText}
          onChange={(e) => setSymptomsText(e.target.value)}
          placeholder="Exemple: skin_rash, itching, headache"
          rows={4}
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 16, marginTop: 16 }}>
        <div className="card" style={{ padding: 16 }}>
          <SymptomesTab
            selectedCodes={selectedCodes}
            onChangeSelectedCodes={setSelectedCodes}
            applyLabel="Mettre dans le texte"
            onApply={applySelectedToText}
          />
        </div>

        <div className="card" style={{ padding: 16 }}>
          <AISuggestionsTab symptomsText={symptomsText} />
        </div>
      </div>
    </div>
  );
}