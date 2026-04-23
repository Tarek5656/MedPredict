// pages/Calendrier.jsx
import React, { useEffect, useMemo, useState } from "react";
import rendezvousService from "../services/rendezvousService";
import { extractApiError } from "../utils/format";
import { Link, useNavigate  } from "react-router-dom";

function pad(n) { return String(n).padStart(2, "0"); }
function toYMD(d) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; }

function startOfMonth(d) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }

function addDays(d, n) { return new Date(d.getTime() + n * 86400000); }

function monthGrid(monthDate) {
  const first = startOfMonth(monthDate);
  const last = endOfMonth(monthDate);

  // Lundi=0..Dimanche=6
  const mondayBased = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -mondayBased);

  const days = [];
  for (let i = 0; i < 42; i++) days.push(addDays(gridStart, i)); // 6 semaines
  return { days, first, last };
}

export default function Calendrier() {
  const [month, setMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());

  const [rdvOfSelectedDay, setRdvOfSelectedDay] = useState([]);
  const [countsByDay, setCountsByDay] = useState({}); // { 'YYYY-MM-DD': count }
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const navigate = useNavigate();

  const { days, first, last } = useMemo(() => monthGrid(month), [month]);

  const loadSelectedDay = async (d) => {
    setErr(null);
    setLoading(true);
    try {
      const ymd = toYMD(d);
      const res = await rendezvousService.listByDate(ymd);
      const data = Array.isArray(res.data) ? res.data : res.data.results || [];
      // tri par heure
      data.sort((a, b) => new Date(a.date_heure) - new Date(b.date_heure));
      setRdvOfSelectedDay(data);

      // mise à jour compteur du jour (pratique si tu cliques)
      setCountsByDay((prev) => ({ ...prev, [ymd]: data.length }));
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  // Charger les compteurs du mois: on fait 1 call par jour (simple).
  // Si tu veux optimiser, on pourra créer un endpoint "month" côté backend.
  const loadMonthCounts = async () => {
    setErr(null);
    setLoading(true);
    try {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const tasks = [];
      const map = {};
      for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
        const ymd = toYMD(d);
        tasks.push(
          rendezvousService.listByDate(ymd, { non_annule: "1" }).then((res) => {
            const arr = Array.isArray(res.data) ? res.data : res.data.results || [];
            map[ymd] = arr.length;
          })
        );
      }
      await Promise.all(tasks);
      setCountsByDay(map);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMonthCounts();
  }, [month.getFullYear(), month.getMonth()]);

  useEffect(() => {
    loadSelectedDay(selectedDay);
  }, [selectedDay.toDateString()]);

  const prevMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  const nextMonth = () => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isInMonth = (d) => d.getMonth() === month.getMonth();

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Calendrier</h2>

        <button onClick={prevMonth}>◀</button>
        <div style={{ fontWeight: 700 }}>
          {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
        </div>
        <button onClick={nextMonth}>▶</button>

        <Link to="/calendrier/jour" style={{ marginLeft: "auto" }}>
          Voir agenda du jour
        </Link>
      </div>

      {err && <p style={{ color: "crimson" }}>{err}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 16 }}>
        {/* Grille mois */}
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8, marginBottom: 10, opacity: 0.75 }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
              <div key={d} style={{ fontSize: 12, fontWeight: 700 }}>{d}</div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
            {days.map((d) => {
              const ymd = toYMD(d);
              const count = countsByDay[ymd] ?? 0;
              const selected = isSameDay(d, selectedDay);

              const handleDayClick = () => {
                if (!selected) {
                  // 1er clic: sélectionner
                  setSelectedDay(d);
                  return;
                }
                // 2e clic (déjà sélectionné): naviguer
                navigate(`/calendrier/jour?date=${ymd}`);
              };

              return (
                <button
                  key={ymd}
                  type="button"
                  onClick={handleDayClick}
                  style={{
                    display: "block",
                    border: "1px solid var(--border-color)",
                    background: selected ? "var(--primary)" : "transparent",
                    color: selected ? "white" : "var(--text-main)",
                    borderRadius: 12,
                    padding: 10,
                    textAlign: "left",
                    opacity: isInMonth(d) ? 1 : 0.45,
                    cursor: "pointer",
                    minHeight: 64,
                    textDecoration: "none",
                  }}
                  title={selected ? `${ymd} (re-clique pour ouvrir l'agenda)` : ymd}
                >
                  <div style={{ fontWeight: 800 }}>{d.getDate()}</div>
                  <div style={{ fontSize: 12, opacity: 0.85 }}>
                    {loading ? "" : count ? `${count} RDV` : "—"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Liste du jour */}
        <div className="card" style={{ padding: '24px', backgroundColor: 'white', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--primary-light)', color: 'var(--primary)', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, marginTop: '4px' }}>
                {rdvOfSelectedDay.length} Rendez-vous
              </div>
            </div>
            <Link to={`/calendrier/jour?date=${toYMD(selectedDay)}`} 
              style={{ fontSize: '0.875rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none', background: 'var(--bg-color)', padding: '8px 16px', borderRadius: '999px' }}
              className="hover-bg-slate"
            >
              Agenda
            </Link>
          </div>

          {rdvOfSelectedDay.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🗓️</div>
              <p style={{ margin: 0, fontWeight: 500 }}>Aucun rendez-vous de planifié.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rdvOfSelectedDay.map((r) => {
                return (
                  <div key={r.id} style={{ 
                    position: 'relative', background: 'var(--bg-color)', borderRadius: 16, padding: '16px 20px',
                    border: '1px solid var(--border-color)', borderLeft: `6px solid var(--primary)`,
                    transition: 'transform 0.2s', cursor: 'pointer', overflow: 'hidden'
                  }} className="hover-shadow">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--primary)", fontWeight: 800, fontSize: "1rem" }}>
                        <i className="fa-regular fa-clock" style={{ fontSize: "1rem" }}></i>
                        {new Date(r.date_heure).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div style={{ 
                        fontSize: '0.65rem', fontWeight: 800, padding: '4px 8px', borderRadius: '6px', 
                        background: '#fee2e2', color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: '0.05em', border: '1px solid var(--border-color)'
                      }}>
                        {r.statut_effectif || 'STANDARD'}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)', marginBottom: '4px' }}>
                      <i className="fa-regular fa-user" style={{ fontSize: "1.1rem", color: 'var(--primary)' }}></i>
                      {r.patient_nom} {r.patient_prenom}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                      <span style={{ opacity: 0.6 }}>Motif:</span>
                      <span style={{ fontWeight: 500 }}>{r.motif || "Consultation standard"}</span>
                      <span style={{ margin: '0 4px', opacity: 0.3 }}>•</span>
                      <span>{r.duree_minutes} min</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}