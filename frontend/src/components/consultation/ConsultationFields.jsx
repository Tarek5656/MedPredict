import React from "react";
import SymptomesTab from "../symptome/SymptomesTab";
import AISuggestionsTab from "../ai/AISuggestionsTab";

export default function ConsultationFields({
  canEdit,
  patient,

  symptomes,
  onChangeSymptomes,

  symptomCodes,
  onChangeSymptomCodes,

  notes_cliniques,
  onChangeNotes,

  diagnostic,
  onChangeDiagnostic,
}) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: 600, display: "block", marginBottom: 8 }}>Symptômes</label>
        <textarea
          disabled={!canEdit}
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
            marginBottom: symptomCodes?.length > 0 ? 12 : 0
          }}
          value={symptomes}
          onChange={(e) => {
            onChangeSymptomes(e.target.value);
            // Synchronisation basique des codes si on tape
            const typed = e.target.value.split(",").map(s => s.trim()).filter(s => s);
            onChangeSymptomCodes(typed);
          }}
          placeholder="Saisissez les symptômes..."
        />

        {symptomCodes?.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {symptomCodes.map((code) => (
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
                  type="button"
                  onClick={() => {
                    const next = symptomCodes.filter(c => c !== code);
                    onChangeSymptomCodes(next);
                    onChangeSymptomes(next.join(", "));
                  }}
                  style={{ 
                    border: "none", 
                    background: "none", 
                    color: "var(--primary)", 
                    cursor: "pointer",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    fontSize: "1.1rem",
                    lineHeight: 1
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        <SymptomesTab
          selectedCodes={symptomCodes}
          onChangeSelectedCodes={(codes) => {
            onChangeSymptomCodes(codes);

            if (codes.length === 0) {
              onChangeSymptomes("");
              return;
            }

            // merge avec le texte existant (sans doublons)
            const existing = (symptomes || "")
              .split(/[,;\n\r]+/g)
              .map((x) => x.trim())
              .filter(Boolean);

            const merged = Array.from(new Set([...existing, ...codes]));
            onChangeSymptomes(merged.join(", "));
          }}
          applyLabel="Ajouter au champ"
          onApply={(codes) => {
            onChangeSymptomCodes(codes);
            
            if (codes.length === 0) {
              onChangeSymptomes("");
              return;
            }

            const existing = (symptomes || "")
              .split(/[,;\n\r]+/g)
              .map((x) => x.trim())
              .filter(Boolean);

            const merged = Array.from(new Set([...existing, ...codes]));
            onChangeSymptomes(merged.join(", "));
          }}
        />
      </div>

      <AISuggestionsTab
        patient={patient}
        symptomsText={symptomes}
        onApplyBest={(best) => onChangeDiagnostic(best)}
      />

      <div>
        <label>Notes cliniques</label>
        <textarea
          disabled={!canEdit}
          style={{ width: "100%", minHeight: 60 }}
          value={notes_cliniques}
          onChange={(e) => onChangeNotes(e.target.value)}
        />
      </div>

      <div>
        <label>Diagnostic</label>
        <textarea
          disabled={!canEdit}
          style={{ width: "100%", minHeight: 60 }}
          value={diagnostic}
          onChange={(e) => onChangeDiagnostic(e.target.value)}
        />
      </div>
    </>
  );
}