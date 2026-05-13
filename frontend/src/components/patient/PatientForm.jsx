import React, { useState } from "react";
import patientService from "../../services/patientService";
import { extractApiError } from "../../utils/format";

export default function PatientForm({ onSuccess }) {
  const [form, setForm] = useState({
    nom: "", prenom: "", date_naissance: "", sexe: "", groupe_sanguin: "", telephone: "", email: "", adresse: "", statut: "actif"
  });
  
  // États séparés pour la date de naissance pour une meilleure UX
  const [dobDay, setDobDay] = useState("");
  const [dobMonth, setDobMonth] = useState("");
  const [dobYear, setDobYear] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Synchronise date_naissance quand dobDay/Month/Year changent
  React.useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      set("date_naissance", `${dobYear}-${dobMonth}-${dobDay}`);
    } else {
      set("date_naissance", "");
    }
  }, [dobDay, dobMonth, dobYear]);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    
    // Validation des champs obligatoires
    if (!form.nom.trim()) { setErr("Le nom est obligatoire."); return; }
    if (!form.prenom.trim()) { setErr("Le prénom est obligatoire."); return; }
    if (!form.date_naissance) { setErr("La date de naissance est obligatoire."); return; }
    if (!form.sexe) { setErr("Le sexe est obligatoire."); return; }
    if (!form.groupe_sanguin) { setErr("Le groupe sanguin est obligatoire."); return; }
    if (!form.telephone.trim()) { setErr("Le numéro de téléphone est obligatoire."); return; }
    if (!form.email.trim()) { setErr("L'adresse email est obligatoire."); return; }

    setLoading(true);
    try {
      const payload = { ...form };
      payload.nom = payload.nom.trim();
      payload.prenom = payload.prenom.trim();
      payload.telephone = payload.telephone.trim();
      payload.email = payload.email.trim();

      const res = await patientService.create(payload);
      if (onSuccess) onSuccess(res.data);
    } catch (e2) {
      setErr(extractApiError(e2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {err && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 animate-in fade-in slide-in-from-top-2">
          <i className="fa-solid fa-circle-exclamation mr-2"></i>
          {err}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nom *</label>
          <input 
            type="text"
            className="w-full bg-gray-50 border-gray-100 focus:bg-white transition-all" 
            value={form.nom} 
            onChange={(e) => set("nom", e.target.value)} 
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Prénom *</label>
          <input 
            type="text"
            className="w-full bg-gray-50 border-gray-100 focus:bg-white transition-all" 
            value={form.prenom} 
            onChange={(e) => set("prenom", e.target.value)} 
          />
        </div>
        <div className="md:col-span-2 space-y-2 py-2">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Date de naissance *</label>
          <div className="grid grid-cols-3 gap-4">
            {/* Jour */}
            <div className="relative group">
              <span className="absolute -top-2.5 left-4 px-2 bg-white text-[11px] font-black text-[var(--primary)] uppercase tracking-wider rounded-sm z-10">
                Jour
              </span>
              <select
                className="w-full bg-gray-50 border-gray-200 focus:border-[var(--primary)] focus:bg-white transition-all py-4 px-5 rounded-2xl text-base font-bold text-gray-800 appearance-none cursor-pointer shadow-sm hover:shadow-md"
                value={dobDay}
                onChange={(e) => setDobDay(e.target.value)}
              >
                <option value="">--</option>
                {Array.from({ length: 31 }, (_, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{i + 1}</option>
                ))}
              </select>
            </div>

            {/* Mois */}
            <div className="relative group">
              <span className="absolute -top-2.5 left-4 px-2 bg-white text-[11px] font-black text-[var(--primary)] uppercase tracking-wider rounded-sm z-10">
                Mois
              </span>
              <select
                className="w-full bg-gray-50 border-gray-200 focus:border-[var(--primary)] focus:bg-white transition-all py-4 px-5 rounded-2xl text-base font-bold text-gray-800 appearance-none cursor-pointer shadow-sm hover:shadow-md"
                value={dobMonth}
                onChange={(e) => setDobMonth(e.target.value)}
              >
                <option value="">--</option>
                {[
                  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
                  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
                ].map((m, i) => (
                  <option key={i + 1} value={String(i + 1).padStart(2, "0")}>{m}</option>
                ))}
              </select>
            </div>

            {/* Année */}
            <div className="relative group">
              <span className="absolute -top-2.5 left-4 px-2 bg-white text-[11px] font-black text-[var(--primary)] uppercase tracking-wider rounded-sm z-10">
                Année
              </span>
              <select
                className="w-full bg-gray-50 border-gray-200 focus:border-[var(--primary)] focus:bg-white transition-all py-4 px-5 rounded-2xl text-base font-bold text-gray-800 appearance-none cursor-pointer shadow-sm hover:shadow-md"
                value={dobYear}
                onChange={(e) => setDobYear(e.target.value)}
              >
                <option value="">--</option>
                {Array.from({ length: 120 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return <option key={year} value={year}>{year}</option>;
                })}
              </select>
            </div>
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Sexe *</label>
          <select 
            className="w-full bg-gray-50 border-gray-100 focus:bg-white transition-all" 
            value={form.sexe} 
            onChange={(e) => set("sexe", e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
            <option value="M">Masculin</option>
            <option value="F">Féminin</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Groupe Sanguin *</label>
          <select 
            className="w-full bg-gray-50 border-gray-100 focus:bg-white transition-all" 
            value={form.groupe_sanguin} 
            onChange={(e) => set("groupe_sanguin", e.target.value)}
          >
            <option value="">-- Sélectionner --</option>
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
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Téléphone *</label>
          <input 
            type="tel"
            className="w-full bg-gray-50 border-gray-100 focus:bg-white transition-all" 
            value={form.telephone} 
            onChange={(e) => set("telephone", e.target.value)} 
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Email *</label>
          <input 
            type="email"
            className="w-full bg-gray-50 border-gray-100 focus:bg-white transition-all" 
            value={form.email} 
            onChange={(e) => set("email", e.target.value)} 
          />
        </div>
        <div className="md:col-span-2 space-y-1.5">
          <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Adresse</label>
          <textarea 
            className="w-full bg-gray-50 border-gray-100 focus:bg-white transition-all min-h-[100px]" 
            value={form.adresse} 
            onChange={(e) => set("adresse", e.target.value)} 
          />
        </div>
      </div>

      <div className="pt-4">
        <button 
          className="w-full bg-[var(--primary)] text-white hover:bg-blue-600 shadow-lg shadow-blue-100 py-4 text-base font-bold transition-all active:scale-[0.98]" 
          disabled={loading} 
          type="submit"
        >
          {loading ? (
            <><i className="fa-solid fa-circle-notch fa-spin mr-2"></i> Création...</>
          ) : (
            <><i className="fa-solid fa-user-plus mr-2"></i> Enregistrer le patient</>
          )}
        </button>
      </div>
    </form>
  );
}
