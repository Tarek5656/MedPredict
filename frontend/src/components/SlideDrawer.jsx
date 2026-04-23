import React, { useEffect } from "react";

export default function SlideDrawer({ isOpen, onClose, title, children }) {
  useEffect(() => {
    // Prevent scrolling beneath the drawer
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <h2 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--primary)" }}>{title}</h2>
          <button onClick={onClose} style={{ 
            background: "transparent", border: "none", cursor: "pointer", 
            width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)"
          }} className="hover-bg-slate">
            <i className="fa-solid fa-xmark" style={{ fontSize: '1.25rem' }}></i>
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", paddingRight: "8px" }}>
          {children}
        </div>
      </div>
    </>
  );
}
