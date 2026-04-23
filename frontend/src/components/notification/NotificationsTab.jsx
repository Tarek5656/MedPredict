import { useEffect, useMemo, useRef, useState } from "react";
import {
  listNotifications,
  markAllRead,
  markNotificationRead,
} from "../../services/notificationService";

// Si tu utilises react-router :
import { useNavigate } from "react-router-dom";

export default function NotificationsTab() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const data = await listNotifications();
      setItems(Array.isArray(data) ? data : (data?.results ?? []));
    } catch (e) {
      setError(e.message || "Erreur");
    } finally {
      setLoading(false);
    }
  }

  async function onMarkRead(id) {
    // optimiste
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    try {
      await markNotificationRead(id);
    } catch (e) {
      // rollback si tu veux (optionnel)
      refresh();
    }
  }

  async function onOpenNotif(n) {
    if (!n.read) await onMarkRead(n.id);

    if (n.url) {
      // si ton backend renvoie /patients/1, c'est ok.
      // sinon adapte ici
      navigate(n.url);
      setOpen(false);
    }
  }

  async function onMarkAllRead() {
    const current = items;
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllRead(current);
    } catch (e) {
      refresh();
    }
  }

  // fermer quand on clique en dehors
  useEffect(() => {
    function onDocClick(e) {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // charge au 1er rendu + refresh quand on ouvre
  useEffect(() => {
    refresh();
  }, []);

  // polling seulement quand open
  useEffect(() => {
    if (!open) return;
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div ref={boxRef} style={{ position: "relative", zIndex: 99 }}>
        <button
        onClick={() => {
            const next = !open;
            setOpen(next);
            if (next) refresh();
        }}
        style={{ 
          width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", 
          justifyContent: "center", background: "transparent", border: "1px solid var(--border-color)", 
          cursor: "pointer" 
        }}
        className="hover-bg-slate" title="Notifications">
          <i className="fa-regular fa-bell" style={{ fontSize: '1.25rem', color: '#475569' }}></i>

        {unreadCount > 0 && (
            <span
            style={{
                position: "absolute",
                top: 4,
                right: 6,
                minWidth: 18,
                height: 18,
                padding: "0 6px",
                borderRadius: 999,
                background: "#f43f5e", // rouge bien visible
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid #fff",
                boxShadow: "0 0 3px #222"
            }}
            title={`${unreadCount} non lues`}
            >
            {unreadCount}
            </span>
        )}
        </button>

        {open && (
        <div
            style={{
            position: "absolute",
            right: 0,
            top: 48,
            width: "min(380px, 95vw)",
            maxHeight: 420,
            overflow: "auto",
            background: "rgba(16,24,40,0.98)",
            border: "1px solid #334155",
            borderRadius: 14,
            boxShadow: "0 8px 32px rgba(0,0,0,.28)",
            color: "#fff",
            zIndex: 200
            }}
        >
            <div
            style={{
                padding: "12px 18px 10px 18px",
                borderBottom: "1px solid #334155",
                display: "flex",
                alignItems: "center",
                gap: 10
            }}
            >
            <div style={{ fontWeight: 900, fontSize: 18, letterSpacing: ".01em" }}>Notifications</div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
                <button
                onClick={onMarkAllRead}
                style={{
                    fontSize: 13,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#60a5fa",
                    textDecoration: "underline",
                    padding: 0
                }}
                >
                Tout marquer lu
                </button>
                <button
                onClick={() => setOpen(false)}
                style={{
                    fontSize: 13,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "#e2e8f0",
                    textDecoration: "underline",
                    padding: 0
                }}
                >
                Fermer
                </button>
            </div>
            </div>

            {loading && (
            <div style={{ padding: 16, color: "#cbd5e1" }}>Chargement...</div>
            )}

            {error && (
            <div style={{ padding: 16, color: "#f87171" }}>Erreur: {error}</div>
            )}

            {!loading && !error && items.length === 0 && (
            <div style={{ padding: 18, color: "#cbd5e1" }}>
                Aucune notification.
            </div>
            )}

            {!loading &&
            !error &&
            items.map((n) => (
                <div
                key={n.id}
                style={{
                    padding: "15px 18px 8px 18px",
                    borderBottom: "1px solid #233",
                    background: n.read
                    ? "rgba(0,0,0,0.00)"
                    : "linear-gradient(90deg, #2563eb11 0%, #0ea5e922 100%)"
                }}
                >
                <div
                    style={{
                    fontWeight: 800,
                    fontSize: 15,
                    marginBottom: 2,
                    color: "#fff"
                    }}
                >
                    {n.title}
                </div>

                {!!n.body && (
                    <div
                    style={{
                        fontSize: 13,
                        color: "#cbd5e1",
                        marginBottom: 2
                    }}
                    >
                    {n.body}
                    </div>
                )}

                <div
                    style={{
                    marginTop: 6,
                    display: "flex",
                    gap: 16,
                    alignItems: "center"
                    }}
                >
                    {n.url && (
                    <button
                        onClick={() => onOpenNotif(n)}
                        style={{
                        fontSize: 13,
                        color: "#3b82f6",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontWeight: 600,
                        padding: 0,
                        textDecoration: "underline"
                        }}
                    >
                        Ouvrir
                    </button>
                    )}

                    {!n.read && (
                    <button
                        onClick={() => onMarkRead(n.id)}
                        style={{
                        fontSize: 12,
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        color: "#a5b4fc",
                        opacity: 0.92,
                        textDecoration: "underline"
                        }}
                    >
                        Marquer comme lue
                    </button>
                    )}

                    <span
                    style={{
                        marginLeft: "auto",
                        fontSize: 11,
                        color: "#a5b4fc",
                        opacity: 0.79
                    }}
                    >
                    {new Date(n.created_at).toLocaleString()}
                    </span>
                </div>
                </div>
            ))}
        </div>
        )}
    </div>
    );
}