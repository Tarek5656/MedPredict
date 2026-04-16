import React, { useEffect, useMemo, useState } from "react";
import consultationService from "../../services/consultationService";
import { extractApiError } from "../../utils/format";

function normalizeToken(s) {
  return (s || "")
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_ ]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/ /g, "_");
}

function splitUserSymptoms(text) {
  return (text || "")
    .split(/[,;\n\r]+/g)
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AISuggestionsTab({ symptomsText = "", onApplyBest }) {
  const [features, setFeatures] = useState([]);
  const [loadingFeatures, setLoadingFeatures] = useState(false);

  const [predicting, setPredicting] = useState(false);
  const [err, setErr] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadFeatures = async () => {
      setLoadingFeatures(true);
      setErr(null);
      try {
        const res = await consultationService.aiFeatures();
        setFeatures(res.data?.features || []);
      } catch (e) {
        setErr(extractApiError(e) || "Impossible de charger la liste des symptômes IA.");
      } finally {
        setLoadingFeatures(false);
      }
    };
    loadFeatures();
  }, []);

  // ... garde normalizeToken / splitUserSymptoms identiques

  // Remplace ton featureSet par ceci
  const featureMap = useMemo(() => {
    const m = new Map();
    for (const f of features || []) {
      const k = normalizeToken(f);
      if (k && !m.has(k)) m.set(k, f); // garde la 1ère forme originale
    }
    return m;
  }, [features]);

  const featureSet = useMemo(() => new Set(featureMap.keys()), [featureMap]);

  // Remplace le parsed par ceci (affiche en "original")
  const parsed = useMemo(() => {
    const raw = splitUserSymptoms(symptomsText);
    const normalized = raw.map(normalizeToken).filter(Boolean);

    const recognizedTokens = [];
    const unknown = [];

    for (let i = 0; i < normalized.length; i++) {
      const token = normalized[i];
      if (featureSet.has(token)) recognizedTokens.push(token);
      else unknown.push(raw[i]);
    }

    const recognizedUniqueTokens = Array.from(new Set(recognizedTokens));
    const recognizedDisplay = recognizedUniqueTokens.map((t) => featureMap.get(t) || t);

    return { recognizedTokens: recognizedUniqueTokens, recognizedDisplay, unknown };
  }, [symptomsText, featureSet, featureMap]);

  const predict = async () => {
    setErr(null);
    setResult(null);

    if (loadingFeatures) return setErr("Chargement des symptômes IA en cours...");
    if (features.length === 0) return setErr("Aucune feature chargée (service IA indisponible ?).");
    if (parsed.recognizedDisplay.length === 0)
      return setErr("Aucun symptôme reconnu. Exemple attendu: skin_rash, itching, headache...");

    setPredicting(true);
    try {
  const res = await consultationService.aiPredict({ symptoms: parsed.recognizedDisplay, top_k: 5, });   
  setResult(res.data);
    } catch (e) {
      setErr(extractApiError(e) || "Erreur de prédiction IA.");
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h4 style={{ margin: 0 }}>IA — Analyse symptômes</h4>
        <span style={{ opacity: 0.7 }}>
          {loadingFeatures ? "Chargement..." : `${features.length} symptômes connus`}
        </span>

        <button style={{ marginLeft: "auto" }} type="button" onClick={predict} disabled={predicting}>
          {predicting ? "Analyse..." : "Analyser"}
        </button>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div>
          <b>Reconnus ({parsed.recognizedDisplay.length})</b>
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            {parsed.recognizedDisplay.length === 0 ? "—" : parsed.recognizedDisplay.join(", ")}
          </div>
        </div>

        <div>
          <b>Inconnus ({parsed.unknown.length})</b>
          <div style={{ marginTop: 6, opacity: 0.9 }}>
            {parsed.unknown.length === 0 ? "—" : parsed.unknown.join(", ")}
          </div>
        </div>
      </div>

      {result?.suggestions?.length ? (
        <div style={{ marginTop: 12, borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
          <b>Suggestions</b>
          <ul style={{ marginTop: 8 }}>
            {result.suggestions.map((s) => (
              <li key={s.disease}>
                {s.disease} — <b>{Math.round(s.probability * 100)}%</b>
              </li>
            ))}
          </ul>

          {onApplyBest ? (
            <button
              type="button"
              onClick={() => onApplyBest(result.suggestions[0]?.disease || "")}
              disabled={!result.suggestions[0]?.disease}
            >
              Utiliser la meilleure suggestion
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}