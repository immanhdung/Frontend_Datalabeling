import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV
    ? "/api"
    : "https://labelhub-backend.onrender.com/api");

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");

  if (
    token &&
    !config.url.toLowerCase().includes("/auth/login")
  ) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Log for debugging
  if (import.meta.env.DEV) {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`, config.headers.Authorization ? "With Token" : "No Token");
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized! Logging out...");
      // If we get 401 on something other than login, probably token is dead
      if (!error.config.url.toLowerCase().includes("/auth/login")) {
         localStorage.removeItem("accessToken");
         localStorage.removeItem("user");
         // Notify app (if we had a dispatcher)
         if (window.location.pathname !== "/login") {
            window.location.href = "/login?expired=true";
         }
      }
    }
    return Promise.reject(error);
  }
);

const trySequential = async (requestFactories) => {
  let lastError;

  for (const requestFactory of requestFactories) {
    try {
      return await requestFactory();
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
};

export const reviewAPI = {
  getPendingReviews: () => api.get("/reviews/pending"),
  getAnnotationForReview: (taskId) => api.get(`/reviews/tasks/${taskId}`),
  approve: (annotationId, payload) =>
    api.post(`/reviews/${annotationId}/approve`, payload),
  reject: (annotationId, payload) =>
    api.post(`/reviews/${annotationId}/reject`, payload),
};
 
export const projectAPI = {
  getById: (id) => api.get(`/projects/${id}`),
};

export const taskAPI = {
  getAll: () => api.get("/tasks"),
  assign: (datasetId, userId, projectId) =>
    api.post("/tasks/assign", {
      datasetId: String(datasetId),
      projectId: String(projectId || ""),
      assignedTo: String(userId),
      timeLimitMinutes: 60, // Bổ sung tham số bắt buộc
    }),
  getMyTasks: () =>
    trySequential([
      () => api.get("/tasks"),
      () => api.get("/tasks/assigned"),
      () => api.get("/tasks?status=opened"),
    ]),
  getById: (taskId) => api.get(`/tasks/${taskId}`),
  getItems: (taskId) => api.get(`/tasks/${taskId}/items`),
  submit: (taskId) => api.post(`/tasks/${taskId}/submit`), // Nếu backend có endpoint submit task riêng
};

export const annotationAPI = {
  submit: (payload) => api.post("/annotations/submit", payload),
  skip: (payload) => api.post("/annotations/skip", payload),
  getByItem: (itemId) => api.get(`/tasks/items/${itemId}/annotations`),
};

export const userAPI = {
  getAll: () => api.get("/users"),
};

export const categoryAPI = {
  getAll: () =>
    trySequential([
      () => api.get("/categories"),
      () => api.get("/Categories"),
    ]),
  create: (payload) =>
    trySequential([
      () => api.post("/categories", payload),
      () => api.post("/Categories", payload),
    ]),
  update: (categoryId, payload) =>
    trySequential([
      () => api.put(`/categories/${categoryId}`, payload),
      () => api.put(`/Categories/${categoryId}`, payload),
    ]),
};

export const labelAPI = {
  create: (categoryId, payload) =>
    trySequential([
      () =>
        api.post("/labels", {
          categoryId: String(categoryId),
          name: payload?.name,
        }),
      () => api.post(`/categories/${categoryId}/labels`, payload),
      () => api.post(`/Categories/${categoryId}/labels`, payload),
      () => api.post(`/labelsets/${categoryId}/labels`, payload),
      () => api.post(`/LabelSets/${categoryId}/labels`, payload),
    ]),
  update: (categoryId, labelId, payload) =>
    trySequential([
      () => api.put(`/labels/${labelId}`, payload),
      () => api.patch(`/labels/${labelId}`, payload),
      () => api.put(`/categories/${categoryId}/labels/${labelId}`, payload),
      () => api.patch(`/categories/${categoryId}/labels/${labelId}`, payload),
      () => api.put(`/Categories/${categoryId}/labels/${labelId}`, payload),
      () => api.patch(`/Categories/${categoryId}/labels/${labelId}`, payload),
      () => api.put(`/labelsets/${categoryId}/labels/${labelId}`, payload),
      () => api.patch(`/labelsets/${categoryId}/labels/${labelId}`, payload),
    ]),
  remove: (categoryId, labelId, labelName) =>
    trySequential([
      () => api.delete(`/labels/${labelId}`),
      () => api.delete(`/categories/${categoryId}/labels/${labelId}`),
      () => api.delete(`/Categories/${categoryId}/labels/${labelId}`),
      () => api.delete(`/labelsets/${categoryId}/labels/${labelId}`),
      () => api.delete(`/LabelSets/${categoryId}/labels/${labelId}`),
      () => api.delete(`/categories/${categoryId}/labels`, { data: { name: labelName } }),
      () => api.delete(`/labelsets/${categoryId}/labels`, { data: { name: labelName } }),
    ]),
};

export default api;