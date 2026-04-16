import api from "./api";

const symptomeService = {
  list: (params = {}) => api.get("/symptoms/", { params }),
};

export default symptomeService;