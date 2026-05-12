import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { menuItems } from "../utils/menuItems";
import userService from "../services/userService";
import { applyTheme } from "../utils/theme";

export default function Sidebar() {

  const from = import.meta.env.VITE_TWILIO_WHATSAPP_FROM;
  const joinCode = import.meta.env.VITE_TWILIO_SANDBOX_JOIN_CODE;

  const phone = (from || "")
    .replace(/^whatsapp:/, "") // enlève "whatsapp:"
    .replace(/^\+/, "");       // enlève "+"

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(joinCode)}`;

  const location = useLocation();
  const navigate = useNavigate();
  const [me, setMe] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    applyTheme("green");
    window.location.href = "/login"; 
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
            display: "flex", alignItems: "center", justifyContent: "center", color: "white",
            boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)"
          }}>
            <i className="fa-solid fa-heart-pulse" style={{ fontSize: "20px" }}></i>
          </div>
          <div>
            <h2 style={{ 
              fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "var(--primary)", 
              lineHeight: 1.2, letterSpacing: "-0.025em" 
            }}>MedPredict</h2>
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
              <i className={item.icon} style={{ fontSize: 18, width: 24, textAlign: 'center' }}></i>
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: "auto", borderTop: "1px solid var(--border-color)", paddingTop: 24, paddingBottom: 0 }}>
        <a 
        href={waUrl} target="_blank" rel="noopener noreferrer" style={{ 
          display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px", margin: "4px 16px",
          borderRadius: 9999, textDecoration: "none", fontSize: "2rem", fontWeight: 500,
          backgroundColor: "transparent", color: "var(--primary)", border: "none", width: "calc(100% - 32px)", cursor: "pointer"
        }} className="hover-bg-slate" title="Chatbot WhatsApp">
          <i className="fa-regular fa-comment-dots"></i>
        </a>
        <button onClick={handleLogout} style={{ 
          display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", margin: "4px 16px",
          borderRadius: 9999, textDecoration: "none", fontSize: "0.875rem", fontWeight: 500,
          backgroundColor: "transparent", color: "var(--text-muted)", border: "none", width: "calc(100% - 32px)", cursor: "pointer", textAlign: "left"
        }} className="hover-bg-slate">
          <i className="fa-solid fa-right-from-bracket" style={{ fontSize: 18, width: 24, textAlign: 'center' }}></i>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
