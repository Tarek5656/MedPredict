export function menuItems(me) {
  const groups = (me?.groups || [])
    .map((g) => (typeof g === "string" ? g : g?.name))
    .filter(Boolean)
    .map((s) => String(s).trim().toUpperCase());

  // menu “normal” (inchangé)
  const base = [
    { name: "Overview", icon: "dashboard", path: "/overview" },
    { name: "Calendrier", icon: "calendar_today", path: "/calendrier" },
    { name: "Patients", icon: "group", path: "/patients" },
    { name: "Rendez-vous", icon: "event_available", path: "/rendezvous" },
    { name: "Analyses", icon: "analytics", path: "/analyses" },
  ];

  // superuser / medecin : ne change rien
  if (me?.is_superuser || groups.includes("MEDECIN")) return base;

  // secretaire : enlever Analytics
  if (groups.includes("SECRETAIRE")) {
    return base.filter((item) => item.name !== "Analyses"); // ou item.path !== "/analyses"
  }

  // patient : ton menu patient
  if (groups.includes("PATIENT")) {
    return [
      { name: "Overview", icon: "dashboard", path: "/overview" },
      { name: "Calendrier", icon: "calendar_today", path: "/calendrier" },
      { name: "Profile", icon: "person", path: "/patient/infos" },
      { name: "Rendez-vous", icon: "event_available", path: "/patient/rendezvous" },
      { name: "Consultations", icon: "medical_information", path: "/patient/consultation" },
    ];
  }

  return base;
}