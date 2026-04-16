export const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
};

export const themeFromMe = (me) => {
  const groups = (me?.groups || [])
    .map((g) => (typeof g === "string" ? g : g.name))
    .filter(Boolean)
    .map((s) => String(s).trim().toUpperCase()); // ✅ MAJUSCULE

  if (me?.is_superuser) return "red";
  if (groups.includes("MEDECIN")) return "blue";
  if (groups.includes("SECRETAIRE")) return "green";
  if (groups.includes("PATIENT")) return "yellow";

  return "green";
};