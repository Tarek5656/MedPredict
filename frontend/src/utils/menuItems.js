export function menuItems(me) {
  const groups = (me?.groups || [])
    .map((g) => (typeof g === "string" ? g : g?.name))
    .filter(Boolean)
    .map((s) => String(s).trim().toUpperCase());

  // menu “normal” (inchangé)
  const base = [
    { name: "Overview", icon: "fa-solid fa-chart-line", path: "/overview" },
    { name: "Calendrier", icon: "fa-regular fa-calendar-days", path: "/calendrier" },
    { name: "Patients", icon: "fa-solid fa-user-group", path: "/patients" },
    { name: "Rendez-vous", icon: "fa-regular fa-calendar-check", path: "/rendezvous" },
    { name: "Analyses", icon: "fa-solid fa-chart-simple", path: "/analyses" },
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
      { name: "Overview", icon: "fa-solid fa-chart-line", path: "/overview" },
      { name: "Calendrier", icon: "fa-regular fa-calendar-days", path: "/calendrier" },
      { name: "Profile", icon: "fa-regular fa-user", path: "/patient/infos" },
      { name: "Rendez-vous", icon: "fa-regular fa-calendar-check", path: "/patient/rendezvous" },
      { name: "Consultations", icon: "fa-solid fa-file-waveform", path: "/patient/consultation" },
    ];
  }

  return base;
}