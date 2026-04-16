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
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>RDV du {selectedDay.toLocaleDateString()}</h3>
            <Link to={`/calendrier/jour?date=${toYMD(selectedDay)}`} style={{ marginLeft: "auto" }}>
              Ouvrir agenda
            </Link>
          </div>

          {rdvOfSelectedDay.length === 0 ? (
            <p className="muted">Aucun rendez-vous.</p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {rdvOfSelectedDay.map((r) => (
                <div key={r.id} style={{ border: "1px solid var(--border-color)", borderRadius: 12, padding: 12 }}>
                  <div style={{ fontWeight: 800 }}>
                    {new Date(r.date_heure).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} • {r.duree_minutes} min
                  </div>
                  <div style={{ opacity: 0.85 }}>
                    {r.patient_nom} {r.patient_prenom}
                  </div>
                  <div style={{ opacity: 0.7 }}>{r.motif || "—"} • {r.statut_effectif}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}