export function formatDateTime(value) {
  if (!value) return "";
  try {
    const d = new Date(value);
    return d.toLocaleString();
  } catch {
    return value;
  }
}

// utils/format.js
export function extractApiError(err) {
  const status = err?.response?.status;
  const data = err?.response?.data;

  // Pas de réponse HTTP => réseau / serveur down
  if (!status || data == null) {
    return "Erreur réseau / serveur indisponible";
  }

  // String brute
  if (typeof data === "string") {
    return data || `Erreur ${status}`;
  }

  // Format DRF classique: { detail: "..." }
  if (typeof data?.detail === "string") {
    return data.detail;
  }

  // Format DRF validation: { field: ["msg1", "msg2"], ... }
  if (typeof data === "object") {
    const lines = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) {
        lines.push(`${key}: ${value.join(" ")}`);
      } else if (typeof value === "string") {
        lines.push(`${key}: ${value}`);
      } else if (value && typeof value === "object") {
        // ex: nested serializers
        lines.push(`${key}: ${JSON.stringify(value)}`);
      } else {
        lines.push(`${key}: ${String(value)}`);
      }
    }
    if (lines.length) return lines.join("\n");
  }

  return `Erreur ${status}`;
}