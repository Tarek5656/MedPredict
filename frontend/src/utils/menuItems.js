export function menuItems(me) {
  const groups = (me?.groups || [])
    .map((g) => (typeof g === "string" ? g : g?.name))
    .filter(Boolean)
    .map((s) => String(s).trim().toUpperCase());

  // 1. Superuser / Admin
  if (me?.is_superuser || groups.includes("ADMIN")) {
    return [
      { name: "Administration", icon: "fa-solid fa-crown", path: "/admin/dashboard" },
      { name: "Analyses", icon: "fa-solid fa-chart-simple", path: "/analyses" }
    ];
  }

  // 2. Patient
  if (groups.includes("PATIENT")) {
    return [
      { name: "Profil", icon: "fa-regular fa-user", path: "/patient/infos" },
      { name: "Calendrier", icon: "fa-regular fa-calendar-days", path: "/calendrier" },
      { name: "Rendez-vous", icon: "fa-regular fa-calendar-check", path: "/patient/rendezvous" },
      { name: "Consultations", icon: "fa-solid fa-file-waveform", path: "/patient/consultation" },
    ];
  }

  // 3. Médecin ou Secrétaire
  const isMedecin = groups.includes("MEDECIN");
  const isSecretaire = groups.includes("SECRETAIRE");

  if (isMedecin || isSecretaire) {
    const items = [
      { name: "Tableau de bord", icon: "fa-solid fa-chart-line", path: "/overview" },
      { name: "Calendrier", icon: "fa-regular fa-calendar-days", path: "/calendrier" },
      { name: "Patients", icon: "fa-solid fa-user-group", path: "/patients" },
      { name: "Rendez-vous", icon: "fa-regular fa-calendar-check", path: "/rendezvous" },
      { name: "Messagerie", icon: "fa-solid fa-comments", path: "/messaging" },
    ];

    if (isMedecin) {
      items.push({ name: "Analyses", icon: "fa-solid fa-chart-simple", path: "/analyses" });
    }

    return items;
  }

  return [];
}