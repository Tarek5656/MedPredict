import api from "./api";

const rendezvousService = {
  getAll: (params = {}) => api.get("/rendezvous/", { params }),
  create: (data) => api.post("/rendezvous/", data),
  patch: (id, data) => api.patch(`/rendezvous/${id}/`, data),
  remove: (id) => api.delete(`/rendezvous/${id}/`),
  annuler: (id) => api.post(`/rendezvous/${id}/annuler/`),
  approuver: (id) => api.post(`/rendezvous/${id}/approuver/`),
  refuser: (id) => api.post(`/rendezvous/${id}/refuser/`),
  me: () => api.get("/rendezvous/me/"),
  listByDate: (ymd, { nonAnnule = true } = {}) =>
  api.get("/rendezvous/", { params: { date: ymd, non_annule: nonAnnule } }),
};

export default rendezvousService;