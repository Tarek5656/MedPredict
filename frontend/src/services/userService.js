import api from "./api";

const userService = {
  me: () => api.get("/me/"),
  medecins: () => api.get("/medecins/"),
  updateCredentials: (payload) => api.patch("/me/update-credentials/", payload), // ✅
};

export default userService;