import React, { useState } from "react";
import patientService from "../../services/patientService";
import { extractApiError } from "../../utils/format";

export default function PatientForm({ onSuccess }) {
  const [form, setForm] = useState({
    nom: "", prenom: "", date_naissance: "", sexe: "", groupe_sanguin: "", telephone: "", email: "", adresse: "", statut: "actif"
  });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    if (!form.nom.trim() || !form.prenom.trim()) {
      setErr("Nom et prénom sont obligatoires.");
      return;
    }

    setLoading(true);
    try {
      const payload = { ...form };
      payload.nom = payload.nom.trim();
      payload.prenom = payload.prenom.trim();
      if (!payload.date_naissance) delete payload.date_naissance;
      if (!payload.sexe) delete payload.sexe;
      if (!payload.groupe_sanguin) delete payload.groupe_sanguin;

      const res = await patientService.create(payload);
      if (onSuccess) onSuccess(res.data);
    } catch (e2) {
      setErr(extractApiError(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {err && <div style={{ background: "var(--error-container)", color: "var(--on-error-container)", padding: "12px 16px", borderRadius: 12, fontSize: "0.875rem" }}>{err}</div>}
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Nom *</label>
          <input style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem" }} value={form.nom} onChange={(e) => set("nom", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Prénom *</label>
          <input style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem" }} value={form.prenom} onChange={(e) => set("prenom", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Date de naissance</label>
          <input type="date" style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem" }} value={form.date_naissance} onChange={(e) => set("date_naissance", e.target.value)} />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Sexe</label>
          <select style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem" }} value={form.sexe} onChange={(e) => set("sexe", e.target.value)}>
            <option value="">--</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Groupe Sanguin</label>
          <select style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem" }} value={form.groupe_sanguin} onChange={(e) => set("groupe_sanguin", e.target.value)}>
            <option value="">--</option>
            <option value="A+">A positif</option>
                  <option value="A-">A négatif</option>
                  <option value="B+">B positif</option>
                  <option value="B-">B négatif</option>
                  <option value="AB+">AB positif</option>
                  <option value="AB-">AB négatif</option>
                  <option value="O+">O positif</option>
                  <option value="O-">O négatif</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Téléphone</label>
          <input style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem" }} value={form.telephone} onChange={(e) => set("telephone", e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Email</label>
          <input style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem" }} value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={{ display: "block", marginBottom: 6, fontSize: "0.875rem", fontWeight: 600 }}>Adresse</label>
          <textarea style={{ width: "100%", padding: "10px 14px", borderRadius: 12, border: "none", background: "var(--surface-container-high)", fontSize: "0.95rem", minHeight: 80 }} value={form.adresse} onChange={(e) => set("adresse", e.target.value)} />
        </div>
      </div>

      <button style={{ 
        marginTop: 24, padding: "12px 24px", borderRadius: 9999, border: "none", background: "var(--primary)", 
        color: "white", fontWeight: 600, fontSize: "1rem", cursor: "pointer", width: "100%", transition: "all 0.2s"
      }} className="hover:opacity-90 active:scale-95" disabled={loading} type="submit">
        {loading ? "Création..." : "Enregistrer le patient"}
      </button>
    </form>
  );
}
