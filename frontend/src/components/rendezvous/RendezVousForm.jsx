import React, { useEffect, useMemo, useState } from "react";
import { extractApiError } from "../../utils/format";
import rendezvousService from "../../services/rendezvousService";
import patientService from "../../services/patientService";
import userService from "../../services/userService";

const BUSINESS_HOURS = { start: 8, end: 18 };
const SLOT_DURATION = 30; // minutes

export default function RendezVousForm({
  onSuccess,
  initialValues,
  lockDateTime = false,
  lockDuree = false,
  me: meProp = null,
  fixedPatientId = null,
}) {
  const [me, setMe] = useState(meProp);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  // Form State
  const [form, setForm] = useState(() => ({
    patient: "",
    medecin: "",
    date: "",
    time: "",
    duree_minutes: "30",
    motif: "",
    statut: "planifie",
    ...(initialValues || {}),
  }));

  // If initialValues.date_heure exists, split it
  useEffect(() => {
    if (initialValues?.date_heure) {
      const dt = new Date(initialValues.date_heure);
      if (!isNaN(dt.getTime())) {
        const ymd = dt.toISOString().split('T')[0];
        const hm = dt.toTimeString().split(' ')[0].substring(0, 5);
        setForm(f => ({ ...f, date: ymd, time: hm }));
      }
    }
  }, [initialValues]);

  const [patients, setPatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [medecins, setMedecins] = useState([]);
  const [loadingMedecins, setLoadingMedecins] = useState(false);
  
  // Availability state
  const [dayAppointments, setDayAppointments] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  const meReady = !!me;
  const isPatientUser = (me?.groups || []).includes("PATIENT");
  const [lockedPatientId, setLockedPatientId] = useState(fixedPatientId ?? null);
  const [lockedPatientLabel, setLockedPatientLabel] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Load "me"
  useEffect(() => {
    if (meProp) return;
    userService.me().then(res => setMe(res.data)).catch(() => {});
  }, [meProp]);

  // Load Patient Profile if connected as patient
  useEffect(() => {
    if (fixedPatientId) {
      setLockedPatientId(fixedPatientId);
      setLockedPatientLabel(`Patient #${fixedPatientId}`);
      return;
    }
    if (!meReady || !isPatientUser) return;

    patientService.me().then(res => {
      setLockedPatientId(res.data.id);
      setLockedPatientLabel(`#${res.data.id} — ${res.data.nom} ${res.data.prenom}`);
    }).catch(() => {});
  }, [fixedPatientId, isPatientUser, meReady]);

  // Sync locked patient to form
  useEffect(() => {
    if (lockedPatientId) set("patient", String(lockedPatientId));
  }, [lockedPatientId]);

  // Load lists
  useEffect(() => {
    if (!meReady) return;
    if (!lockedPatientId) {
      setLoadingPatients(true);
      patientService.getAll({ page: 1 }).then(res => {
        setPatients(Array.isArray(res.data) ? res.data : (res.data?.results || []));
      }).finally(() => setLoadingPatients(false));
    }
    setLoadingMedecins(true);
    userService.medecins().then(res => setMedecins(res.data || [])).finally(() => setLoadingMedecins(false));
  }, [meReady, lockedPatientId]);

  // Fetch appointments for availability
  useEffect(() => {
    if (!form.date || !form.medecin) {
      setDayAppointments([]);
      return;
    }
    setLoadingSlots(true);
    rendezvousService.listByDate(form.date)
      .then(res => {
        const all = Array.isArray(res.data) ? res.data : (res.data?.results || []);
        // Filter by selected doctor
        setDayAppointments(all.filter(a => String(a.medecin) === String(form.medecin) && a.statut !== 'annule'));
      })
      .finally(() => setLoadingSlots(false));
  }, [form.date, form.medecin]);

  // Calculate Slots
  const availableSlots = useMemo(() => {
    const slots = [];
    const startHour = BUSINESS_HOURS.start;
    const endHour = BUSINESS_HOURS.end;
    
    for (let h = startHour; h < endHour; h++) {
      for (let m = 0; m < 60; m += SLOT_DURATION) {
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        
        // Check if occupied
        const isOccupied = dayAppointments.some(appt => {
          // Simplistic check: if it starts at the exact same time
          // In a real app, we should check for overlaps based on duration
          const apptTime = new Date(appt.date_heure).toTimeString().substring(0, 5);
          return apptTime === timeStr;
        });

        slots.push({ time: timeStr, available: !isOccupied });
      }
    }
    return slots;
  }, [dayAppointments]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);

    if (!form.patient) return setErr("Le patient est obligatoire.");
    if (!form.medecin) return setErr("Le médecin est obligatoire.");
    if (!form.date || !form.time) return setErr("La date et l'heure sont obligatoires.");

    setLoading(true);
    try {
      const payload = {
        patient: Number(form.patient),
        medecin: Number(form.medecin),
        date_heure: `${form.date}T${form.time}:00`,
        duree_minutes: Number(form.duree_minutes),
        motif: form.motif,
        statut: "planifie",
      };
      const res = await rendezvousService.create(payload);
      onSuccess?.(res.data);
    } catch (e2) {
      setErr(extractApiError(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6 animate-fade-in">
      {err && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 flex items-center gap-3">
          <i className="fa-solid fa-circle-exclamation"></i>
          {err}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Patient Selection */}
        <div className={`${lockedPatientId ? '' : 'md:col-span-2'} space-y-1.5`}>
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Patient *</label>
          {lockedPatientId ? (
            <div className="relative">
              <input value={lockedPatientLabel} readOnly className="w-full bg-gray-50 border-gray-100 py-3 px-4 rounded-xl text-sm font-semibold text-gray-600 cursor-default" />
              <i className="fa-solid fa-lock absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
            </div>
          ) : (
            <div className="relative group">
              <select className="w-full bg-gray-50 border-gray-200 focus:border-[var(--primary)] focus:bg-white transition-all py-3 px-4 rounded-xl text-sm font-semibold text-gray-800 appearance-none cursor-pointer"
                value={form.patient} onChange={e => set("patient", e.target.value)} disabled={loadingPatients}>
                <option value="">{loadingPatients ? "Chargement..." : "-- choisir le patient --"}</option>
                {patients.map(p => <option key={p.id} value={p.id}>#{p.id} — {p.nom} {p.prenom}</option>)}
              </select>
              <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
            </div>
          )}
        </div>

        {/* Doctor Selection */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Médecin *</label>
          <div className="relative group">
            <select className="w-full bg-gray-50 border-gray-200 focus:border-[var(--primary)] focus:bg-white transition-all py-3 px-4 rounded-xl text-sm font-semibold text-gray-800 appearance-none cursor-pointer"
              value={form.medecin} onChange={e => set("medecin", e.target.value)} disabled={loadingMedecins}>
              <option value="">{loadingMedecins ? "Chargement..." : "-- choisir le médecin --"}</option>
              {medecins.map(m => (
                <option key={m.id} value={m.id}>Dr. {m.first_name || m.last_name ? `${m.first_name || ""} ${m.last_name || ""}`.trim() : m.username}</option>
              ))}
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
          </div>
        </div>

        {/* Date Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Date *</label>
          <input type="date" className="w-full bg-gray-50 border-gray-100 focus:border-[var(--primary)] focus:bg-white transition-all py-3 px-4 rounded-xl text-sm font-semibold text-gray-800"
            value={form.date} onChange={e => set("date", e.target.value)} disabled={lockDateTime} />
        </div>

        {/* Duration Picker */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Durée</label>
          <div className="relative group">
            <select className="w-full bg-gray-50 border-gray-200 focus:border-[var(--primary)] focus:bg-white transition-all py-3 px-4 rounded-xl text-sm font-semibold text-gray-800 appearance-none cursor-pointer"
              value={form.duree_minutes} onChange={e => set("duree_minutes", e.target.value)} disabled={lockDuree}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
            </select>
            <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs"></i>
          </div>
        </div>

        {/* Time Slots Selection */}
        <div className="md:col-span-2 space-y-3">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1 flex justify-between items-center">
            Horaires disponibles
            {loadingSlots && <i className="fa-solid fa-circle-notch fa-spin text-primary"></i>}
          </label>
          
          {!form.medecin || !form.date ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 p-6 rounded-2xl text-center text-gray-400 text-sm">
              Sélectionnez un médecin et une date pour voir les créneaux
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {availableSlots.map(slot => (
                <button
                  key={slot.time}
                  type="button"
                  disabled={!slot.available || lockDateTime}
                  onClick={() => set("time", slot.time)}
                  className={`py-2.5 rounded-xl text-xs font-bold transition-all border-2 relative flex items-center justify-center gap-1 ${
                    form.time === slot.time 
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)] shadow-lg shadow-green-200 scale-110 z-10' 
                      : !slot.available 
                        ? 'bg-gray-50 text-gray-300 border-gray-50 cursor-not-allowed opacity-40' 
                        : 'bg-white text-gray-600 border-gray-100 hover:border-[var(--primary)] hover:text-[var(--primary)] hover:scale-105'
                  }`}
                >
                  {form.time === slot.time && <i className="fa-solid fa-check text-[10px]"></i>}
                  {slot.time}
                </button>
              ))}
            </div>
          )}
          {form.time && !availableSlots.find(s => s.time === form.time)?.available && (
             <p className="text-[10px] text-orange-500 font-bold ml-1 italic">* Ce créneau a été réservé entre temps</p>
          )}
        </div>

        {/* Motif */}
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Motif de consultation</label>
          <input className="w-full bg-gray-50 border-gray-100 focus:border-[var(--primary)] focus:bg-white transition-all py-3 px-4 rounded-xl text-sm font-semibold text-gray-800"
            value={form.motif} onChange={e => set("motif", e.target.value)} />
        </div>
      </div>

      <button className="w-full mt-4 bg-[var(--primary)] text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-100 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
        disabled={loading || !form.time} type="submit">
        {loading ? <i className="fa-solid fa-circle-notch fa-spin"></i> : <i className="fa-solid fa-calendar-check"></i>}
        {loading ? "Création en cours..." : "Confirmer le rendez-vous"}
      </button>
    </form>
  );
}