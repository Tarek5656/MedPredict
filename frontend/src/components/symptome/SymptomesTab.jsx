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
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 10, padding: 12, marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <b>Symptômes</b>
        <span style={{ opacity: 0.7 }}>{count} total</span>
        <span style={{ marginLeft: "auto", opacity: 0.7 }}>
          Sélectionnés: {selectedSet.size}
        </span>
      </div>

      {err ? <p style={{ color: "crimson" }}>{err}</p> : null}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <input
          style={{ flex: 1 }}
          value={q}
          placeholder="Rechercher (ex: rash, headache...)"
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <button type="button" onClick={load} disabled={loading}>
          {loading ? "..." : "Rechercher"}
        </button>

        <button
          type="button"
          onClick={() => onApply?.(Array.from(selectedSet))}
          disabled={!onApply || selectedSet.size === 0}
        >
          {applyLabel}
        </button>
      </div>

      <div style={{ marginTop: 10, maxHeight: 260, overflow: "auto", border: "1px solid #f3f4f6", borderRadius: 8 }}>
        {items.map((s) => (
          <label key={s.code} style={{ display: "flex", gap: 8, padding: 8, borderBottom: "1px solid #f3f4f6" }}>
            <input
              type="checkbox"
              checked={selectedSet.has(s.code)}
              onChange={() => toggle(s.code)}
            />
            <span>
              <code>{s.code}</code>
              {s.label ? <span style={{ marginLeft: 8, opacity: 0.75 }}>{s.label}</span> : null}
            </span>
          </label>
        ))}
        {items.length === 0 && !loading ? <div style={{ padding: 8, opacity: 0.7 }}>— Aucun résultat —</div> : null}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" disabled={loading || !hasPrev} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          ←
        </button>
        <span style={{ alignSelf: "center" }}>Page {page}</span>
        <button type="button" disabled={loading || !hasNext} onClick={() => setPage((p) => p + 1)}>
          →
        </button>

        <button
          type="button"
          style={{ marginLeft: "auto" }}
          onClick={() => onChangeSelectedCodes([])}
          disabled={selectedSet.size === 0}
        >
          Tout désélectionner
        </button>
      </div>
    </div>
  );
}