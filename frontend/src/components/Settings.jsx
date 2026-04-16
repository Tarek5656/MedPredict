// components/SettingsForm.jsx
import React, { useEffect, useState } from "react";
import userService from "../services/userService";
import { extractApiError } from "../utils/format";

export default function SettingsForm({ onSuccess }) {
  const [form, setForm] = useState({
    username: "",
    current_password: "",
    new_password: "",
    confirm_new_password: "",
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await userService.me();
        setForm((f) => ({ ...f, username: res.data.username || "" }));
      } catch {
        // ignore
      }
    })();
  }, []);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!form.current_password) return setErr("Le mot de passe actuel est obligatoire.");

    setLoading(true);
    try {
      await userService.updateCredentials({
        username: form.username?.trim() || undefined,
        current_password: form.current_password,
        new_password: form.new_password || undefined,
        confirm_new_password: form.confirm_new_password || undefined,
      });

      setMsg("Mise à jour effectuée.");

      setForm((f) => ({
        ...f,
        current_password: "",
        new_password: "",
        confirm_new_password: "",
      }));

      onSuccess?.();
    } catch (e2) {
      setErr(extractApiError(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
      {err ? <div style={{ color: "crimson", whiteSpace: "pre-line" }}>{err}</div> : null}
      {msg ? <div style={{ color: "green" }}>{msg}</div> : null}

      <div>
        <label>Username</label>
        <input
          style={{ width: "100%" }}
          value={form.username}
          onChange={(e) => set("username", e.target.value)}
          disabled={loading}
        />
      </div>

      <hr />

      <div>
        <label>Mot de passe actuel *</label>
        <input
          style={{ width: "100%" }}
          type="password"
          value={form.current_password}
          onChange={(e) => set("current_password", e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label>Nouveau mot de passe</label>
        <input
          style={{ width: "100%" }}
          type="password"
          value={form.new_password}
          onChange={(e) => set("new_password", e.target.value)}
          disabled={loading}
        />
      </div>

      <div>
        <label>Confirmer nouveau mot de passe</label>
        <input
          style={{ width: "100%" }}
          type="password"
          value={form.confirm_new_password}
          onChange={(e) => set("confirm_new_password", e.target.value)}
          disabled={loading}
        />
      </div>

      <button type="submit" disabled={loading}>
        {loading ? "Enregistrement..." : "Enregistrer"}
      </button>
    </form>
  );
}