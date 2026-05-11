// pages/CalendrierJour.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import rendezvousService from "../services/rendezvousService";
import { extractApiError } from "../utils/format";
import RendezVousForm from "../components/rendezvous/RendezVousForm";
import userService from "../services/userService";
import Modal from "../components/Modal";

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
  const [medecinFilter, setMedecinFilter] = useState("ALL");
  const [medecins, setMedecins] = useState([]);
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
      const [meRes, medecinsRes] = await Promise.all([
        userService.me(),
        userService.medecins(),
      ]);

      setMe(meRes.data);
      setMedecins(medecinsRes.data || []);
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
    let filtered = [...items];
    if (medecinFilter !== "ALL") {
      filtered = filtered.filter(r => String(r.medecin) === String(medecinFilter));
    }

    return filtered.map((r) => {
      const start = new Date(r.date_heure);
      const end = addMinutes(start, Number(r.duree_minutes || 0));
      return { ...r, _start: start, _end: end };
    });
  }, [items, medecinFilter]);

  const slots = useMemo(() => buildSlots(day, 15), [day]);

  const isSlotFree = (slotStart) => {
    const slotEnd = addMinutes(slotStart, dureeMinutes);
    return !rdvIntervals.some((r) => overlaps(slotStart, slotEnd, r._start, r._end));
  };

  const findAllRdvStartingHere = (slotStart) => {
    return rdvIntervals.filter((r) => r._start.getTime() === slotStart.getTime());
  };

  const isPastSlot = (slotStart) => slotStart.getTime() < Date.now();

  return (
    <>
      <div className="page-container animate-fade-in">
        <div className="flex items-center gap-4 mb-10">
          <h2 className="text-3xl font-bold text-gray-900 m-0">Agenda du jour</h2>

          <div className="flex items-center gap-3 ml-auto">
            {/* Navigation Date Style Smooth */}
            <button
              className="w-10 h-10 rounded-full text-[var(--primary)] bg-white hover:bg-[var(--primary)] hover:text-white transition-all flex items-center justify-center shadow-sm"
              onClick={() => setDay(addDays(day, -1))}
            >
              <i className="fa-solid fa-chevron-left"></i>
            </button>

            <div className="bg-[#dcfce7] text-[#115e59] px-8 py-3 rounded-full font-bold text-lg shadow-sm">
              {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </div>

            <button
              className="w-10 h-10 rounded-full text-[var(--primary)] bg-white hover:bg-[var(--primary)] hover:text-white transition-all flex items-center justify-center shadow-sm"
              onClick={() => setDay(addDays(day, 1))}
            >
              <i className="fa-solid fa-chevron-right"></i>
            </button>

            <div aria-hidden="true" style={{ width: 1, height: 32, backgroundColor: "var(--border-color)", margin: "0 8px" }} />

            <div className="relative">
              <select
                className="bg-white border border-gray-100 rounded-full px-6 py-3 text-sm font-bold text-gray-700 shadow-sm focus:ring-2 focus:ring-primary/20 outline-none appearance-none cursor-pointer pr-10"
                value={medecinFilter}
                onChange={(e) => setMedecinFilter(e.target.value)}
              >
                <option value="ALL">Tous les médecins</option>
                {medecins.map(m => (
                  <option key={m.id} value={m.id}>
                    Dr. {m.first_name || m.last_name ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : m.username}
                  </option>
                ))}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
            </div>
          </div>
        </div>

        {err && <p style={{ color: "crimson" }}>{err}</p>}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {slots.map((slotStart) => {
            const rdvs = findAllRdvStartingHere(slotStart);
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
                  background: rdvs.length > 0 ? "rgba(72,179,155,0.10)" : "transparent",
                  opacity: 1,
                }}
              >
                <div style={{ fontFamily: "monospace" }}>
                  {pad(slotStart.getHours())}:{pad(slotStart.getMinutes())}
                </div>

                <div className="space-y-2">
                  {rdvs.length > 0 ? (
                    rdvs.map(rdv => (
                      <div key={rdv.id} className="p-2 rounded-lg bg-white/50 border border-white/20">
                        <div style={{ fontWeight: 800 }}>
                          {rdv.patient_nom} {rdv.patient_prenom}
                        </div>
                        <div style={{ opacity: 0.8, fontSize: "0.85rem" }}>
                          <span style={{ color: "var(--primary)", fontWeight: 600 }}>
                            Dr. {rdv.medecin_nom || rdv.medecin_prenom ? `${rdv.medecin_prenom || ""} ${rdv.medecin_nom || ""}`.trim() : `Doc #${rdv.medecin}`}
                          </span>
                          {" • "}{rdv.motif || "—"} • {rdv.duree_minutes} min
                          {rdv.statut_effectif === 'termine' ? (
                            <span style={{ marginLeft: 8, fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: '#dcfce7', color: '#166534', fontWeight: 800, textTransform: 'uppercase' }}>Terminé</span>
                          ) : rdv.statut_effectif === 'annule' ? (
                            <span style={{ marginLeft: 8, fontSize: '0.65rem', padding: '2px 6px', borderRadius: 4, background: '#fee2e2', color: '#991b1b', fontWeight: 800, textTransform: 'uppercase' }}>Annulé</span>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={{ opacity: 0.75, paddingLeft: "8px" }}>
                      {past ? "Indisponible" : "Libre"}
                    </div>
                  )}
                </div>

                {(!isMedecin) ? (
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    {!past ? (
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

      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title="Nouveau rendez-vous"
        maxWidth="max-w-2xl"
      >
        <RendezVousForm
          me={me}
          initialValues={{
            date_heure: selectedSlot ? toDateTimeLocal(selectedSlot) : "",
            duree_minutes: String(dureeMinutes),
            statut: "planifie",
            medecin: medecinFilter !== "ALL" ? medecinFilter : "",
          }}
          lockDateTime={true}
          onSuccess={() => {
            closeModal();
            load();
          }}
        />
      </Modal>
    </>
  );
}