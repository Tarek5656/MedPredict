import React from "react";

export default function OrdonnanceFields({ ordo, setOrdo, emptyLine }) {
  return (
    <div style={{ marginTop: 6, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
      <h4 style={{ margin: "0 0 8px 0" }}>Ordonnance (optionnel)</h4>

      <div style={{ display: "grid", gap: 10 }}>
        <div>
          <label>Notes ordonnance</label>
          <textarea
            style={{ width: "100%", minHeight: 50 }}
            value={ordo.notes}
            onChange={(e) => setOrdo((s) => ({ ...s, notes: e.target.value }))}
          />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <b>Médicaments</b>
            <button
              type="button"
              style={{ marginLeft: "auto" }}
              onClick={() => setOrdo((s) => ({ ...s, lignes: [...s.lignes, emptyLine()] }))}
            >
              + Ajouter
            </button>
          </div>

          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {ordo.lignes.length === 0 ? (
              <p style={{ opacity: 0.7 }}>— Aucun médicament —</p>
            ) : (
              ordo.lignes.map((l, idx) => (
                <div key={idx} style={{ border: "1px solid #f3f4f6", borderRadius: 8, padding: 10 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
                    <div>
                      <label>Nom</label>
                      <input
                        style={{ width: "100%" }}
                        value={l.nom}
                        onChange={(e) =>
                          setOrdo((s) => {
                            const copy = [...s.lignes];
                            copy[idx] = { ...copy[idx], nom: e.target.value };
                            return { ...s, lignes: copy };
                          })
                        }
                      />
                    </div>

                    <div>
                      <label>Dosage</label>
                      <input
                        style={{ width: "100%" }}
                        value={l.dosage}
                        onChange={(e) =>
                          setOrdo((s) => {
                            const copy = [...s.lignes];
                            copy[idx] = { ...copy[idx], dosage: e.target.value };
                            return { ...s, lignes: copy };
                          })
                        }
                      />
                    </div>

                    <div>
                      <label>Fréquence</label>
                      <input
                        style={{ width: "100%" }}
                        value={l.frequence}
                        onChange={(e) =>
                          setOrdo((s) => {
                            const copy = [...s.lignes];
                            copy[idx] = { ...copy[idx], frequence: e.target.value };
                            return { ...s, lignes: copy };
                          })
                        }
                      />
                    </div>

                    <div>
                      <label>Durée (jours)</label>
                      <input
                        type="number"
                        min={1}
                        style={{ width: "100%" }}
                        value={l.duree_jours}
                        onChange={(e) =>
                          setOrdo((s) => {
                            const copy = [...s.lignes];
                            copy[idx] = { ...copy[idx], duree_jours: e.target.value };
                            return { ...s, lignes: copy };
                          })
                        }
                      />
                    </div>
                  </div>

                  <div style={{ marginTop: 8 }}>
                    <label>Instructions</label>
                    <textarea
                      style={{ width: "100%", minHeight: 50 }}
                      value={l.instructions}
                      onChange={(e) =>
                        setOrdo((s) => {
                          const copy = [...s.lignes];
                          copy[idx] = { ...copy[idx], instructions: e.target.value };
                          return { ...s, lignes: copy };
                        })
                      }
                    />
                  </div>

                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() =>
                        setOrdo((s) => {
                          const copy = [...s.lignes];
                          copy.splice(idx, 1);
                          return { ...s, lignes: copy };
                        })
                      }
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}