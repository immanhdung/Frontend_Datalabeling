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

  return config;
});

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

export const taskAPI = {
  getAll: () => api.get("/tasks"),
  assign: (taskId, userId, projectId) =>
    api.post("/tasks/assign", {
      taskId: String(taskId),
      projectId: String(projectId || ""),
      assignedTo: String(userId),
    }),
  getMyTasks: () =>
    trySequential([
      () => api.get("/tasks/annotator"),
      () => api.get("/tasks/my-tasks"),
      () => api.get("/tasks"),
    ]),
  getById: (taskId) => api.get(`/tasks/${taskId}`),
  submit: (taskId, payload) => api.post(`/tasks/${taskId}/submit`, payload),
};

export const annotationAPI = {
  create: (payload) =>
    trySequential([
      () => api.post("/annotations", payload),
      () => api.post("/annotation", payload),
    ]),
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