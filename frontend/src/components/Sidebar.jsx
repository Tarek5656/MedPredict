import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { menuItems } from "../utils/menuItems";
import userService from "../services/userService";

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const run = async () => {
      try {
        const res = await userService.me();
        setMe(res.data);
      } catch {
        setMe(null);
      }
    };
    run();
  }, []);

  return (
    <aside style={{ 
      height: "100vh", width: 256, position: "fixed", left: 0, top: 0, zIndex: 50,
      display: "flex", flexDirection: "column", padding: "24px 0", backgroundColor: "var(--bg-color)",
      borderRight: "1px solid var(--border-color)", boxSizing: "border-box"
    }}>
      <div style={{ padding: "0 32px", marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ 
            width: 40, height: 40, borderRadius: 12, background: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "white"
          }}>
            <span className="material-symbols-outlined">health_and_safety</span>
          </div>
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 700, margin: 0, color: "var(--text-main)", lineHeight: 1.2 }}>MedPredict</h2>
            <p style={{ fontSize: "0.75rem", margin: 0, color: "var(--text-muted)", opacity: 0.8 }}>Premium Care</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        {menuItems(me).map(item => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <Link key={item.name} to={item.path} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", margin: "4px 16px",
              borderRadius: 9999, textDecoration: "none", fontSize: "0.875rem", fontWeight: 500,
              backgroundColor: isActive ? "var(--primary)" : "transparent",
              color: isActive ? "white" : "var(--text-muted)",
              transition: "all 0.2s"
            }} className={!isActive ? "hover-bg-slate" : ""}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: 24, paddingBottom: 0 }}>
        <button style={{ 
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", margin: "4px 16px",
          borderRadius: 9999, textDecoration: "none", fontSize: "0.875rem", fontWeight: 500,
          backgroundColor: "transparent", color: "var(--text-muted)", border: "none", width: "calc(100% - 32px)", cursor: "pointer", textAlign: "left"
        }} className="hover-bg-slate">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>help_outline</span>
          <span>Support</span>
        </button>
        <button onClick={handleLogout} style={{ 
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", margin: "4px 16px",
          borderRadius: 9999, textDecoration: "none", fontSize: "0.875rem", fontWeight: 500,
          backgroundColor: "transparent", color: "var(--text-muted)", border: "none", width: "calc(100% - 32px)", cursor: "pointer", textAlign: "left"
        }} className="hover-bg-slate">
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
