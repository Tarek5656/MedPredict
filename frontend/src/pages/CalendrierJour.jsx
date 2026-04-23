// pages/CalendrierJour.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import rendezvousService from "../services/rendezvousService";
import { extractApiError } from "../utils/format";
import RendezVousForm from "../components/rendezvous/RendezVousForm";
import userService from "../services/userService";

function pad(n) { return String(n).padStart(2, "0"); }
function toYMD(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }
function addMinutes(d, m) { return new Date(d.getTime() + m * 60000); }
function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && aEnd > bStart;
}

function buildSlots(day, stepMinutes = 15) {
  const mk = (h, min) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, min, 0, 0);
  const ranges = [
    { start: mk(9, 0), end: mk(13, 0) },
    { start: mk(15, 0), end: mk(18, 0) },
  ];

  const slots = [];
  for (const r of ranges) {
    for (let t = new Date(r.start); t < r.end; t = addMinutes(t, stepMinutes)) {
      slots.push(t);
    }
  }
  return slots;
}

export default function CalendrierJour() {
  const [searchParams, setSearchParams] = useSearchParams();

  const initialDate = searchParams.get("date"); // YYYY-MM-DD
  const [day, setDay] = useState(() =>
    initialDate ? new Date(initialDate + "T00:00:00") : new Date()
  );

  const [items, setItems] = useState([]);
  const [dureeMinutes, setDureeMinutes] = useState(30);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);

  const toDateTimeLocal = (d) => {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  };

  const openAdd = (slotStart) => {
    setSelectedSlot(slotStart);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
  };

  const [me, setMe] = useState(null);
  const isMedecin = (me?.groups || []).includes("MEDECIN");
  const isSecretaire = (me?.groups || []).includes("SECRETAIRE");
  const isSuperuser = !!me?.is_superuser;
  const isAdmin = isSuperuser || (me?.groups || []).includes("ADMIN");
  const isPatient = (me?.groups || []).includes("PATIENT");

  const load = async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await rendezvousService.listByDate(toYMD(day));
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      const [meRes] = await Promise.all([
        userService.me(),
      ]);

      setMe(meRes.data);
      data.sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));
      setItems(data);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearchParams({ date: toYMD(day) });
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day.toDateString()]);

  const rdvIntervals = useMemo(() => {
    return items.map((r) => {
      const start = new Date(r.date_heure);
      const end = addMinutes(start, Number(r.duree_minutes || 0));
      return { ...r, _start: start, _end: end };
    });
  }, [items]);

  const slots = useMemo(() => buildSlots(day, 15), [day]);

  const isSlotFree = (slotStart) => {
    const slotEnd = addMinutes(slotStart, dureeMinutes);
    return !rdvIntervals.some((r) => overlaps(slotStart, slotEnd, r._start, r._end));
  };

  const findRdvStartingHere = (slotStart) => {
    return rdvIntervals.find((r) => r._start.getTime() === slotStart.getTime());
  };

  const isPastSlot = (slotStart) => slotStart.getTime() < Date.now();

  return (
    <>
      <div className="page-container animate-fade-in">
        <div className="flex items-center gap-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-900 m-0">Agenda du jour</h2>

          <div className="flex items-center gap-2 ml-auto">
            <button className="outline" style={{ padding: '0.6rem' }} onClick={() => setDay(addDays(day, -1))}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <div className="badge badge-success" style={{ padding: '0.8rem 1.5rem', fontSize: '1rem', fontWeight: 700 }}>
              {day.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
            <button className="outline" style={{ padding: '0.6rem' }} onClick={() => setDay(addDays(day, 1))}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-2 bg-gray-100 p-2 rounded-xl border border-gray-200">
              <label className="text-xs font-bold text-gray-500 uppercase ml-2">Durée</label>
              <select 
                value={dureeMinutes} 
                onChange={(e) => setDureeMinutes(Number(e.target.value))}
                className="bg-transparent border-none p-1 font-bold text-primary"
                style={{ width: 'auto', minWidth: '80px' }}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>60 min</option>
              </select>
            </div>
            
            <button 
              onClick={load} 
              disabled={loading}
              className="outline"
              style={{ padding: '0.6rem 1.2rem', fontSize: '0.85rem' }}
            >
              <i className={`fa-solid fa-arrows-rotate ${loading ? "fa-spin" : ""}`}></i>
              Rafraîchir
            </button>
          </div>
        </div>

        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {slots.map((slotStart) => {
            const rdv = findRdvStartingHere(slotStart);
            const free = isSlotFree(slotStart);
            const past = isPastSlot(slotStart);

            return (
              <div
                key={slotStart.toISOString()}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr 140px",
                  alignItems: "center",
                  borderTop: "1px solid var(--border-color)",
                  padding: "10px 12px",
                  background: rdv ? "rgba(72,179,155,0.10)" : "transparent",
                  opacity: free || rdv ? 1 : 0.55,
                }}
              >
                <div style={{ fontFamily: "monospace" }}>
                  {pad(slotStart.getHours())}:{pad(slotStart.getMinutes())}
                </div>

                <div>
                  {rdv ? (
                    <>
                      <div style={{ fontWeight: 800 }}>
                        {rdv.patient_nom} {rdv.patient_prenom}
                      </div>
                      <div style={{ opacity: 0.8 }}>
                        {rdv.motif || "—"} • {rdv.duree_minutes} min • {rdv.statut_effectif}
                      </div>
                    </>
                  ) : (
                    <div style={{ opacity: 0.75 }}>Libre</div>
                  )}
                </div>

                {(!isMedecin) ? (
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                {!rdv && free && !past ? (
                    <button type="button" onClick={() => openAdd(slotStart)}>
                    + Ajouter
                    </button>
                ) : (
                    <span />
                )}
                </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ width: "min(720px, 100%)", padding: 16 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              <h3 className="text-xl font-bold text-gray-800 m-0">Nouveau rendez-vous</h3>
              <button 
                type="button" 
                onClick={closeModal} 
                style={{ 
                  marginLeft: "auto", background: "transparent", border: "none", cursor: "pointer",
                  width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  color: "var(--text-muted)"
                }}
                className="hover-bg-slate"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <RendezVousForm
              me={me}
              initialValues={{
                date_heure: selectedSlot ? toDateTimeLocal(selectedSlot) : "",
                duree_minutes: String(dureeMinutes),
                statut: "planifie",
              }}
              lockDateTime={true}     // ✅ verrouille date/heure
              // lockDuree={true}      // optionnel: verrouiller aussi la durée
              onSuccess={() => {
                closeModal();
                load();
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}