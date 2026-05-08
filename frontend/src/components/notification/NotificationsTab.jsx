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
  const [filter, setFilter] = useState("unread");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const boxRef = useRef(null);
  const navigate = useNavigate();

  const unreadCount = useMemo(
    () => items.filter((n) => !n.read).length,
    [items]
  );

  const filteredItems = useMemo(() => {
    if (filter === "non lues") {
      return items.filter((n) => !n.read);
    }
    if (filter === "lues") {
      return items.filter((n) => n.read);
    }
    return items;
  }, [items, filter]);

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
          cursor: "pointer",
          boxShadow: "none"
        }}
        className="hover-bg-slate" title="Notifications">
          <i className="fa-regular fa-bell" style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}></i>

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
                background: "var(--danger)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "2px solid var(--card-bg)",
                boxShadow: "var(--shadow-sm)"
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
            top: 56,
            width: "min(380px, 95vw)",
            maxHeight: 420,
            overflow: "auto",
            background: "var(--card-bg)",
            border: "1px solid var(--border-color)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow-lg)",
            color: "var(--text-main)",
            zIndex: 200,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden"
            }}
        >
            <div
            style={{
                padding: "12px 14px 10px",
                borderBottom: "1px solid var(--border-color)",
                background: "var(--card-bg)",
                position: "sticky",
                top: 0,
                zIndex: 10,
            }}
            >
            {/* Ligne 1: titre centré + close à droite */}
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: ".01em" }}>
                Notifications
              </div>

              <button
                onClick={() => setOpen(false)}
                style={{
                  position: "absolute",
                  right: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--text-muted)",
                  boxShadow: "none",
                }}
                className="hover-bg-slate"
                title="Fermer"
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: "1.15rem" }} />
              </button>
            </div>

            {/* Ligne 2: gauche / centre / droite */}
              <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                alignItems: "center",
                gap: 10,
              }}
                >
                {/* Gauche */}
              <div style={{ justifySelf: "start" }}>
                <button
                  onClick={() => setFilter((prev) => (prev === "non lues" ? "lues" : "non lues"))}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    padding: "4px 10px",
                    background: "transparent",
                    color: "var(--primary)",
                    cursor: "pointer",
                    boxShadow: "none",
                  }}
                  className="hover-bg-slate"
                  title="Basculer le filtre"
                >
                  Voir {filter === "non lues" ? "lues" : "non lues"}
                </button>
              </div>

                {/* Centre */}
              <button
                onClick={onMarkAllRead}
                style={{
                  justifySelf: "center",
                  fontSize: 13,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--primary)",
                  fontWeight: 600,
                  padding: 0,
                  boxShadow: "none",
                  whiteSpace: "nowrap",
                }}
                className="hover-opacity"
              >
                Tout marquer lu
              </button>

                {/* Droite */}
              <div style={{ justifySelf: "end" }}>
                <button
                  onClick={() => {
                    setOpen(false);
                    navigate("/notifications/liste");
                  }}
                  style={{
                    fontSize: 13,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--primary)",
                    fontWeight: 600,
                    padding: 0,
                    boxShadow: "none",
                    whiteSpace: "nowrap",
                  }}
                  className="hover-opacity"
                  title="Voir toutes les notifications"
                >
                  Voir tous
                </button>
              </div>
            </div>
          </div>

            <div style={{ overflow: "auto", maxHeight: "360px" }}>
                {loading && (
                <div style={{ padding: 20, color: "var(--text-muted)", textAlign: "center", fontSize: 14 }}>Chargement...</div>
                )}

                {error && (
                <div style={{ padding: 20, color: "var(--danger)", textAlign: "center", fontSize: 14 }}>Erreur: {error}</div>
                )}

                {!loading && !error && items.length === 0 && (
                <div style={{ padding: 30, color: "var(--text-muted)", textAlign: "center", fontSize: 14 }}>
                    Aucune notification pour le moment.
                </div>
                )}

                {!loading &&
                !error &&
                filteredItems.map((n) => (
                    <div
                    key={n.id}
                    style={{
                        padding: "16px 20px",
                        borderBottom: "1px solid var(--border-color)",
                        background: n.read
                        ? "transparent"
                        : "var(--bg-color)",
                        transition: "background-color 0.2s"
                    }}
                    >
                    <div
                        style={{
                        fontWeight: n.read ? 500 : 600,
                        fontSize: 14,
                        marginBottom: 4,
                        color: "var(--text-main)"
                        }}
                    >
                        {n.title}
                    </div>

                    {!!n.body && (
                        <div
                        style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            marginBottom: 8,
                            lineHeight: 1.4
                        }}
                        >
                        {n.body}
                        </div>
                    )}

                    <div
                        style={{
                        marginTop: 8,
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
                            color: "var(--primary)",
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: 600,
                            padding: 0,
                            boxShadow: "none"
                            }}
                        >
                            Ouvrir
                        </button>
                        )}

                        {!n.read && (
                        <button
                            onClick={() => onMarkRead(n.id)}
                            style={{
                            fontSize: 13,
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--text-muted)",
                            padding: 0,
                            boxShadow: "none"
                            }}
                        >
                            Marquer lue
                        </button>
                        )}

                        <span
                        style={{
                            marginLeft: "auto",
                            fontSize: 12,
                            color: "var(--text-muted)",
                        }}
                        >
                        {new Date(n.created_at).toLocaleDateString()} {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                    </div>
                    </div>
                ))}
            </div>
        </div>
        )}
    </div>
    );
}
