import api from "./api";

const adminService = {
  getStats: () => api.get("/admin/stats/"),
  getUsers: () => api.get("/admin/users/"),
  getRecentActivity: () => api.get("/admin/recent-activity/"),
  getSystemHealth: () => api.get("/admin/system-health/"),
  createUser: (userData) => api.post("/admin/users/create/", userData),
  updateUserStatus: (userId, is_active) =>
    api.patch(`/admin/users/${userId}/status/`, { is_active }),
};

export default adminService;
