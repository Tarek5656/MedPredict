import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listNotifications, markNotificationRead } from "../services/notificationService";

export default function NotificationListe() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const navigate = useNavigate();

  const count = notifications.length;

  async function loadNotifications() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listNotifications();
      const items = Array.isArray(data) ? data : (data?.results ?? []);
      setNotifications(items);
    } catch (error) {
      setErr(error?.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function onMarkRead(id) {
    // optimiste
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (e) {
      // rollback
      loadNotifications();
    }
  }

  async function onOpenNotif(n) {
    if (!n.read) await onMarkRead(n.id);

    if (n.url) {
      navigate(n.url);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  return (
    <div className="page-container animate-fade-in">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Notifications</h1>
        <span className="badge badge-success" style={{ padding: "0.4rem 1rem" }}>
          Total: {count}
        </span>
      </div>

      {loading && <p>Chargement...</p>}
      {err && <p style={{ color: "red" }}>Erreur: {err}</p>}

      {!loading && !err && count === 0 && <p>Aucune notification à afficher.</p>}

      {!loading && !err && count > 0 && (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Notification</th>
                <th>Message</th>
                <th>Date de création</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {notifications.map((n) => (
                <tr key={n.id} style={{ background: n.read ? "transparent" : "rgba(0,0,0,0.04)" }}>
                  <td style={{ fontWeight: n.read ? 500 : 700 }}>{n.title}</td>
                  <td>{n.body}</td>
                  <td>
                    {new Date(n.created_at).toLocaleDateString()}{" "}
                    {new Date(n.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td>
                    {n.url ? (
                      <button
                        onClick={() => onOpenNotif(n)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--primary)",
                          cursor: "pointer",
                          fontWeight: 600,
                          padding: 0,
                          boxShadow: "none",
                        }}
                      >
                        Ouvrir
                      </button>
                    ) : (
                      <span style={{ color: "var(--text-muted)" }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}