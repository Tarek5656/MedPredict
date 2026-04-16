import React, { useEffect, useState } from "react";
import { useNavigate} from "react-router-dom";
import userService from "../services/userService";
import SlideDrawer from "../components/SlideDrawer";
import Settings from "../components/Settings";

export default function Header() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [isSettingsOpen, setSettingsOpen] = useState(false);

  const getEspaceLabel = (me) => {
    if (!me) return "";
    if (me.is_superuser) return "Admin";

    const groups = me.groups || []; // ex: ["PATIENT", "MEDECIN", ...]
    if (groups.includes("ADMIN")) return "Admin";
    if (groups.includes("SECRETAIRE")) return "Secrétaire";
    if (groups.includes("MEDECIN")) return "Médecin";
    if (groups.includes("PATIENT")) return "Patient";

    return "Utilisateur";
  };

  useEffect(() => {
    let mounted = true;

    const loadMe = async () => {
      try {
        const res = await userService.me();
        if (mounted) setMe(res.data);
      } catch (e) {
        // si token invalide/expiré, on peut ignorer ici (interceptor gère refresh)
        if (mounted) setMe(null);
      }
    };

    loadMe();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <header style={{ 
      position: "sticky", top: 0, zIndex: 40, display: "flex", justifyContent: "space-between", 
      alignItems: "center", width: "100%", padding: "16px 32px", backgroundColor: "var(--bg-color)",
      borderBottom: "1px solid var(--border-color)", boxSizing: "border-box"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "32px" }}>
        <h1 style={{ fontSize: "1.25rem", margin: 0, fontWeight: 700, color: "var(--primary)" }}>Espace {getEspaceLabel(me)}</h1>
        <div style={{ position: "relative", width: "384px" }}>
          <span className="material-symbols-outlined" style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 20 }}>search</span>
          <input 
            type="text" 
            placeholder="Search patients, records..." 
            style={{ 
              width: "100%", backgroundColor: "var(--card-bg)", border: "none", borderRadius: "9999px",
              padding: "12px 16px 12px 48px", fontSize: "0.875rem"
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }} className="hover-bg-slate">
          <span className="material-symbols-outlined" style={{ color: "var(--text-muted)", fontSize: 22 }}>notifications</span>
        </button>
        <button type="button" onClick={() => setSettingsOpen(true)}
          style={{ width: 44, height: 44, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer" }}
          className="hover-bg-slate"
        >
          <span className="material-symbols-outlined" style={{ color: "var(--text-muted)", fontSize: 22 }}>
            settings
          </span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div aria-hidden="true"
            style={{ height: 24, width: 1, backgroundColor: "var(--border-color)", margin: "0 4px" }}/>
          <div style={{ background: "var(--primary)",
              color: "white", padding: "8px 14px", borderRadius: 9999, fontWeight: 600,
              fontSize: "0.875rem", lineHeight: "1", whiteSpace: "nowrap", boxShadow: "0 6px 18px rgba(0, 107, 89, 0.18)" }}
            title={me?.username || "-"}>
            {me?.username || "-"}
          </div>
        </div>
      </div>
      <SlideDrawer
      isOpen={isSettingsOpen}
      onClose={() => setSettingsOpen(false)}
      title="Paramètres"
    >
      <Settings onSuccess={() => setSettingsOpen(false)} />
    </SlideDrawer>
    </header>
  );
}
