import React, { useEffect, useMemo, useState } from "react";
import symptomeService from "../../services/symptomeService";
import { extractApiError } from "../../utils/format";

export default function SymptomesTab({ selectedCodes, onChangeSelectedCodes, onApply, applyLabel = "Appliquer", }) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const selectedSet = useMemo(() => new Set(selectedCodes || []), [selectedCodes]);

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const params = { page };
      if (q.trim()) params.search = q.trim();

      const res = await symptomeService.list(params);

      if (res.data && Array.isArray(res.data.results)) {
        setItems(res.data.results);
        setCount(res.data.count ?? 0);
        setHasNext(!!res.data.next);
        setHasPrev(!!res.data.previous);
      } else {
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
  }, [q, page]);

  const toggle = (code) => {
    const next = new Set(selectedSet);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    onChangeSelectedCodes(Array.from(next));
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <b style={{ fontSize: "1.1rem", color: "var(--primary)" }}>Sélection des Symptômes</b>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          style={{ flex: 1 }}
          value={q}
          placeholder="Rechercher..."
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />

        <button
          type="button"
          style={{ 
            padding: "8px 16px",
            borderRadius: 8,
            border: "1px solid #fee2e2",
            backgroundColor: "#fef2f2",
            color: "#b91c1c",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            whiteSpace: "nowrap"
          }}
          onClick={() => onChangeSelectedCodes([])}
          disabled={selectedSet.size === 0}
        >
          Effacer tout
        </button>
      </div>

      <div style={{ marginTop: 10, minHeight: 200, position: "relative", border: "1px solid #f1f5f9", borderRadius: 12, overflow: "hidden" }}>
        <div style={{ 
          opacity: loading ? 0.4 : 1, 
          transition: "opacity 0.2s",
          pointerEvents: loading ? "none" : "auto",
          padding: 4
        }}>
          {items.map((s) => (
            <label 
              key={s.code} 
              style={{ 
                display: "flex", 
                alignItems: "center",
                gap: 12, 
                padding: "8px 12px", 
                borderRadius: 8,
                cursor: "pointer",
                backgroundColor: selectedSet.has(s.code) ? "#f0fdfa" : "transparent",
                marginBottom: 2
              }}
              className="hover-bg-slate"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(s.code)}
                onChange={() => toggle(s.code)}
                style={{ width: 16, height: 16, accentColor: "var(--primary)" }}
              />
              <span style={{ fontSize: "0.9rem", fontWeight: selectedSet.has(s.code) ? 600 : 400 }}>
                {s.label || s.name || s.code}
              </span>
            </label>
          ))}
          {!loading && items.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              Aucun symptôme trouvé.
            </div>
          )}
        </div>

        {loading && (
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}>
            <i className="fas fa-spinner fa-spin" style={{ color: "var(--primary)", fontSize: "1.2rem" }}></i>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 20 }}>
        <button 
          type="button" 
          disabled={loading || !hasPrev} 
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          style={{ 
            padding: "6px 16px", 
            borderRadius: 8, 
            border: "1px solid #e2e8f0", 
            backgroundColor: "white",
            cursor: !hasPrev ? "default" : "pointer",
            opacity: !hasPrev ? 0.3 : 1,
            fontSize: "1rem",
            fontWeight: "bold",
            color: "var(--primary)"
          }}
        >
          &larr;
        </button>
        
        <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>
          Page {page} <span style={{ fontWeight: 400, color: "#94a3b8" }}>sur {Math.ceil(count / 10) || 1}</span>
        </span>

        <button 
          type="button" 
          disabled={loading || !hasNext} 
          onClick={() => setPage((p) => p + 1)}
          style={{ 
            padding: "6px 16px", 
            borderRadius: 8, 
            border: "1px solid #e2e8f0", 
            backgroundColor: "white",
            cursor: !hasNext ? "default" : "pointer",
            opacity: !hasNext ? 0.3 : 1,
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