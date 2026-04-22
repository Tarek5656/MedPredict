const API_BASE = "/api";

function getToken() {
  // adapte si ta clé n'est pas "access"
  return (
    localStorage.getItem("access") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

async function request(path, options = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    body: options.body,
  });

  if (!res.ok) {
    // essayer JSON, sinon texte
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.detail || `HTTP ${res.status}`);
    }
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 120)}`);
  }

  return res.status === 204 ? null : res.json();
}

export function listNotifications() {
  return request("/notifications/");
}

export function markNotificationRead(id) {
  return request(`/notifications/${id}/read/`, {
    method: "POST",
    body: JSON.stringify({ read: true }),
  });
}

export async function markAllRead(notifications = []) {
  const unread = notifications.filter((n) => !n.read);
  // en parallèle, mais attention si tu en as beaucoup
  await Promise.all(unread.map((n) => markNotificationRead(n.id)));
}