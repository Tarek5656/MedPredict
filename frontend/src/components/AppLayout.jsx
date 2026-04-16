// src/components/AppLayout.jsx
import React from "react";
import { useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppLayout({ children }) {
  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--bg-color)" }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 256, display: "flex", flexDirection: "column", width: "calc(100% - 256px)" }}>
        <Header />
        <main style={{ padding: "32px", boxSizing: "border-box", width: "100%" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
