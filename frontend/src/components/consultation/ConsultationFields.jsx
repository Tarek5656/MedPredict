import React from "react";
import SymptomesTab from "../symptome/SymptomesTab";
import AISuggestionsTab from "../ai/AISuggestionsTab";

export default function ConsultationFields({
  canEdit,

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
      <div>
        <label>Symptômes</label>
        <textarea
          disabled={!canEdit}
          style={{ width: "100%", minHeight: 60 }}
          value={symptomes}
          onChange={(e) => onChangeSymptomes(e.target.value)}
        />

        <SymptomesTab
          selectedCodes={symptomCodes}
          onChangeSelectedCodes={(codes) => {
            onChangeSymptomCodes(codes);

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