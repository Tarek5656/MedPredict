import api from "./api";

const consultationService = {
  list: (params = {}) => api.get("/consultations/", { params }),
  getById: (id) => api.get(`/consultations/${id}/`), // ✅ ajouté
  create: (data) => api.post("/consultations/", data),
  patch: (id, data) => api.patch(`/consultations/${id}/`, data),

  upsertOrdonnance: (id, data) => api.post(`/consultations/${id}/ordonnance/`, data),
  deleteOrdonnance: (id) => api.delete(`/consultations/${id}/ordonnance/`),
  
  // ✅ IA (sans consultation) — utilise /consultations/ai-predict/
  aiPredict: ({ symptoms, top_k = 5, age, gender }) =>
    api.post("/consultations/ai-predict/", { symptoms, top_k, age, gender }),
  // ✅ IA (enregistre dans la consultation)
  aiPredictForConsultation: (id, { symptoms, top_k = 5, age, gender }) =>
    api.post(`/consultations/${id}/ai-predict/`, { symptoms, top_k, age, gender }),

  // (optionnel) features microservice (si tu en as encore besoin)
  aiFeatures: () => api.get("/consultations/ai-features/"),

  me: () => api.get("/consultations/me/"),
  ordonnance: (id) => api.get(`/consultations/${id}/ordonnance/`), // optionnel
};

export default consultationService;