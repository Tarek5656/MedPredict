import React, { useEffect, useMemo, useState } from "react";
import { extractApiError } from "../../utils/format";
import rendezvousService from "../../services/rendezvousService";
import patientService from "../../services/patientService";
import userService from "../../services/userService";

export default function RendezVousForm({
  onSuccess,
  initialValues,
  lockDateTime = false,
  lockDuree = false,
  me: meProp = null,
  fixedPatientId = null,
}) {
  const [me, setMe] = useState(meProp);

  // si meProp change
  useEffect(() => {
    setMe(meProp);
  }, [meProp]);

  // charge "me" si pas fourni
  useEffect(() => {
    let alive = true;
    if (meProp) return;

    (async () => {
      try {
        const res = await userService.me();
        if (alive) setMe(res.data);
      } catch {
        // ignore (optionnel)
      }
    })();

    return () => {
      alive = false;
    };
  }, [meProp]);

  const isPatientUser = useMemo(
    () => (me?.groups || []).includes("PATIENT"),
    [me]
  );

  const meReady = !!me;

  const [lockedPatientId, setLockedPatientId] = useState(fixedPatientId ?? null);
  const [lockedPatientLabel, setLockedPatientLabel] = useState("");

  useEffect(() => {
    let alive = true;

    // priorité au patient fixé par props
    if (fixedPatientId) {
      setLockedPatientId(fixedPatientId);
      setLockedPatientLabel(`Patient #${fixedPatientId}`);
      return;
    }

    // si pas patient connecté => pas verrouillé
    if (!meReady || !isPatientUser) {
      setLockedPatientId(null);
      setLockedPatientLabel("");
      return;
    }

    (async () => {
      try {
        const res = await patientService.me(); // ✅ /patients/me/
        if (!alive) return;

        setLockedPatientId(res.data.id);
        setLockedPatientLabel(
          `#${res.data.id} — ${(res.data.nom || "").trim()} ${(res.data.prenom || "").trim()}`.trim()
        );
      } catch {
        if (!alive) return;
        setLockedPatientId(null);
        setLockedPatientLabel("");
      }
    })();

    return () => {
      alive = false;
    };
  }, [fixedPatientId, isPatientUser, meReady]);

  const [form, setForm] = useState(() => ({
    patient: lockedPatientId ? String(lockedPatientId) : "",
    date_heure: "",
    duree_minutes: "30",
    motif: "",
    statut: "planifie",
    ...(initialValues || {}),
  }));

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Appliquer initialValues quand ça change
  useEffect(() => {
    if (!initialValues) return;
    setForm((f) => ({ ...f, ...initialValues }));
  }, [initialValues]);

  useEffect(() => {
    const v = Number(form.duree_minutes);
    if (![15, 30].includes(v)) {
      setForm((f) => ({ ...f, duree_minutes: "30" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.duree_minutes]);

  // Forcer patient si verrouillé
  useEffect(() => {
    if (!lockedPatientId) return;
    setForm((f) => ({ ...f, patient: String(lockedPatientId) }));
  }, [lockedPatientId]);

  // Charger patients
  // Charger patients (seulement si pas verrouillé)
  useEffect(() => {
    let alive = true;

    // ✅ tant qu'on ne sait pas qui est connecté, ne charge pas la liste
    if (!meReady) return () => { alive = false; };

    if (lockedPatientId) {
      setPatients([]);
      return () => { alive = false; };
    }

    (async () => {
      setLoadingPatients(true);
      try {
        const res = await patientService.getAll({ page: 1 });
        const items = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        if (alive) setPatients(items);
      } catch (e) {
        if (alive) setErr(extractApiError(e));
      } finally {
        if (alive) setLoadingPatients(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [lockedPatientId, meReady]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);

    if (!form.patient) return setErr("Le patient est obligatoire.");
    if (!String(form.date_heure || "").trim()) return setErr("La date/heure est obligatoire.");

    setLoading(true);
    try {
      const payload = {
        ...form,
        patient: lockedPatientId ? Number(lockedPatientId) : Number(form.patient),
        date_heure: String(form.date_heure).trim(),
        duree_minutes: form.duree_minutes ? Number(form.duree_minutes) : null,
        motif: String(form.motif || "").trim(),
        statut: form.statut,
      };

      const res = await rendezvousService.create(payload);
      onSuccess?.(res.data);

      // reset (on garde patient si verrouillé)
      setForm((f) => ({
        patient: lockedPatientId ? String(lockedPatientId) : "",
        date_heure: "",
        duree_minutes: "30",
        motif: "",
        statut: "planifie",
      }));
    } catch (e2) {
      setErr(extractApiError(e2));
    } finally {
      setLoading(false);
    }
  };

  const patientLabel = (p) => {
    const nom = p.nom || "";
    const prenom = p.prenom || "";
    return `#${p.id} — ${nom} ${prenom}`.trim();
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {err ? (
        <div style={{
          background: "var(--error-container)",
          color: "var(--on-error-container)",
          padding: "12px 16px",
          borderRadius: 12,
          fontSize: "0.875rem",
        }}>
          {err}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>
            Patient *
          </label>

          {lockedPatientId ? (
            <input
              value={lockedPatientLabel || `Patient #${lockedPatientId}`}
              readOnly
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: "var(--surface-container-high)",
                fontSize: "0.95rem",
                opacity: 0.9,
              }}
            />
          ) : (
            <select
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: 12,
                border: "none",
                background: "var(--surface-container-high)",
                fontSize: "0.95rem",
              }}
              value={form.patient}
              onChange={(e) => set("patient", e.target.value)}
              disabled={loadingPatients || loading}
            >
              <option value="">{loadingPatients ? "Chargement..." : "-- choisir --"}</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {patientLabel(p)}
                </option>
              ))}
            </select>
          )}

          {lockedPatientId ? (
            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>
              Patient verrouillé (compte patient connecté).
            </div>
          ) : null}
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>
            Date & heure *
          </label>
          <input
            type="datetime-local"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: "var(--surface-container-high)",
              fontSize: "0.95rem",
              opacity: lockDateTime ? 0.85 : 1,
            }}
            value={form.date_heure}
            onChange={(e) => set("date_heure", e.target.value)}
            disabled={loading || lockDateTime}
          />
        </div>

        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>
            Durée (min)
          </label>
          <select
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: "var(--surface-container-high)",
              fontSize: "0.95rem",
              opacity: lockDuree ? 0.85 : 1,
            }}
            value={String(form.duree_minutes || "30")}
            onChange={(e) => set("duree_minutes", e.target.value)}
            disabled={loading || lockDuree}
          >
            <option value="15">15 min</option>
            <option value="30">30 min</option>
          </select>
        </div>

        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>
            Motif
          </label>
          <input
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: "var(--surface-container-high)",
              fontSize: "0.95rem",
            }}
            value={form.motif}
            onChange={(e) => set("motif", e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      <button
        style={{
          marginTop: 24,
          padding: "12px 24px",
          borderRadius: 9999,
          border: "none",
          background: "var(--primary)",
          color: "white",
          fontWeight: 600,
          fontSize: "1rem",
          cursor: "pointer",
          width: "100%",
        }}
        disabled={loading}
        type="submit"
      >
        {loading ? "Création..." : "Créer le rendez-vous"}
      </button>
    </form>
  );
}