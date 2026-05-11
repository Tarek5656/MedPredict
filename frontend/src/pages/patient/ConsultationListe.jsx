import React, { useEffect, useState } from "react";
import consultationService from "../../services/consultationService";
import patientService from "../../services/patientService";
import { extractApiError } from "../../utils/format";
import { printOrdonnance } from "../../utils/printOrdonnance";
import { motion, AnimatePresence } from "framer-motion";

export default function ConsultationsPatient() {
  const [items, setItems] = useState([]);
  const [patient, setPatient] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const [cRes, pRes] = await Promise.all([
        consultationService.me(),
        patientService.me(),
      ]);
      const data = Array.isArray(cRes.data) ? cRes.data : cRes.data.results || [];
      // Trier par date décroissante
      setItems(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setPatient(pRes.data);
    } catch (e) {
      setErr(extractApiError(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggle = (id) => setExpandedId((cur) => (cur === id ? null : id));

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-gray-500 font-medium italic">Récupération de votre historique médical...</p>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in max-w-4xl mx-auto py-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Mes Consultations</h1>
      </header>

      {err && (
        <div className="badge badge-error w-full p-4 mb-8 text-center flex items-center justify-center gap-2">
          <i className="fa-solid fa-circle-exclamation"></i>
          {err}
        </div>
      )}

      {!err && items.length === 0 ? (
        <div className="card p-16 text-center space-y-4 border-2 border-dashed border-gray-200 bg-gray-50/50">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto text-gray-400">
            <i className="fa-solid fa-notes-medical text-3xl"></i>
          </div>
          <p className="text-xl font-bold text-gray-800">Aucun historique trouvé</p>
          <p className="text-gray-500">Vos consultations apparaîtront ici dès que vous aurez effectué votre première visite.</p>
        </div>
      ) : (
        <div className="relative border-l-2 border-gray-100 ml-4 pl-8 space-y-12">
          {items.map((c, idx) => {
            const isOpen = expandedId === c.id;
            const hasOrdonnance = !!c.ordonnance;
            const dateObj = new Date(c.date);

            return (
              <motion.div 
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                {/* Dot on timeline */}
                <div className={`absolute -left-[41px] top-4 w-5 h-5 rounded-full border-4 border-white shadow-sm ${isOpen ? 'bg-primary' : 'bg-gray-300'}`}></div>

                <div className={`card overflow-hidden transition-all duration-300 ${isOpen ? 'ring-2 ring-primary/20 shadow-xl' : 'hover:shadow-md'}`}>
                  <div 
                    className="p-6 cursor-pointer flex flex-wrap items-center justify-between gap-4"
                    onClick={() => toggle(c.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 text-primary w-12 h-12 rounded-2xl flex items-center justify-center font-bold">
                        {dateObj.getDate()}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg uppercase tracking-tight">
                          {dateObj.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-2">
                          <i className="fa-regular fa-clock"></i>
                          {dateObj.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          <span className="mx-2">•</span>
                          <i className="fa-solid fa-user-doctor"></i>
                          Dr. {c.medecin_nom || "Yahyaoui"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {hasOrdonnance && (
                        <span className="badge badge-success flex items-center gap-1">
                          <i className="fa-solid fa-pills text-[10px]"></i>
                          Ordonnance
                        </span>
                      )}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${isOpen ? 'bg-primary text-white rotate-180' : 'bg-gray-100 text-gray-400'}`}>
                        <i className="fa-solid fa-chevron-down text-xs"></i>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="p-6 pt-0 border-t border-gray-50 bg-gray-50/30">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                            {/* Left Column: Symptoms & Diagnosis */}
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <i className="fa-solid fa-virus-covid text-primary"></i>
                                  Symptômes déclarés
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                  {Array.isArray(c.symptoms) && c.symptoms.length > 0 ? (
                                    c.symptoms.map((s) => (
                                      <span key={s.id} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm">
                                        {s.label || s.code}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-gray-400 italic text-sm">Aucun symptôme enregistré</span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <i className="fa-solid fa-stethoscope text-primary"></i>
                                  Diagnostic médical
                                </h4>
                                <div className="p-4 bg-white border border-gray-100 rounded-xl shadow-sm italic text-gray-800 font-medium">
                                  "{c.diagnostic || "En attente de diagnostic définitif."}"
                                </div>
                              </div>
                            </div>

                            {/* Right Column: Prescription Preview */}
                            <div className="space-y-6">
                              <div>
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                  <i className="fa-solid fa-file-medical text-primary"></i>
                                  Notes & Recommandations
                                </h4>
                                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-wrap">
                                  {c.notes_cliniques || "Aucune note additionnelle pour cette consultation."}
                                </p>
                              </div>

                              {hasOrdonnance && (
                                <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="font-bold text-primary text-sm flex items-center gap-2">
                                      <i className="fa-solid fa-capsules"></i>
                                      Ordonnance active
                                    </h4>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        printOrdonnance({ consultation: c, patient, ordonnance: c.ordonnance });
                                      }}
                                      className="bg-white text-primary border border-primary/20 hover:bg-primary hover:text-white px-3 py-1 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                                    >
                                      <i className="fa-solid fa-print"></i>
                                      Imprimer
                                    </button>
                                  </div>
                                  <ul className="space-y-2">
                                    {c.ordonnance.lignes.map((l) => (
                                      <li key={l.id} className="text-xs flex items-start gap-2 text-gray-700">
                                        <i className="fa-solid fa-circle-check text-green-500 mt-0.5"></i>
                                        <span>
                                          <span className="font-bold">{l.nom}</span> — {l.dosage} 
                                          <span className="text-gray-400 block">{l.frequence} ({l.duree_jours} jours)</span>
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}