/**
 * Service de gestion des patients.
 *
 * Endpoints supposés (DRF) :
 * - GET/POST   /patients/
 * - GET/PUT/PATCH/DELETE /patients/:id/
 * - GET/PATCH  /patients/:id/dossier-medical/  (action custom)
 */

import api from './api';

const patientService = {
  // Liste (tu peux passer params: { search, ordering, page, ... }
  getAll: (params = {}) => api.get('/patients/', { params }),

  // Détail patient
  getById: (id) => api.get(`/patients/${id}/`),

  // Création patient (secrétaire)
  create: (data) => api.post('/patients/', data),

  // Update complet
  update: (id, data) => api.put(`/patients/${id}/`, data),

  // Update partiel
  patch: (id, data) => api.patch(`/patients/${id}/`, data),

  // Delete patient (si autorisé)
  delete: (id) => api.delete(`/patients/${id}/`),

  // Dossier médical (lié au patient)
  getDossierMedical: (id) => api.get(`/patients/${id}/dossier-medical/`),

  // Modifier dossier médical (médecin)
  patchDossierMedical: (id, data) => api.patch(`/patients/${id}/dossier-medical/`, data),

  me: () => api.get("/patients/me/"),
  meDossierMedical: () => api.get("/patients/me/dossier-medical/"),
};

export default patientService;