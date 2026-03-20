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
      if (!error.config.url.toLowerCase().includes("/auth/login")) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
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
  reopen: (taskId, payload) => api.post(`/reviews/tasks/${taskId}/reopen`, payload),
  discard: (taskId, payload) => api.post(`/reviews/tasks/${taskId}/discard`, payload),
  getAll: (params) => api.get("/reviews", { params }),
};

export const projectAPI = {
  getById: (id) => api.get(`/projects/${id}`),
  getDatasets: (id) => api.get(`/projects/${id}/datasets`),
};

export const taskAPI = {
  getAll: (params) => api.get("/tasks", { params }),

  // Fetch tasks assigned to current user
  getMyTasks: () =>
    trySequential([
      () => api.get("/tasks"),
      () => api.get("/tasks?Status=Opened"),
    ]),

  getById: (taskId) => api.get(`/tasks/${taskId}`),
  getItems: (taskId) => api.get(`/tasks/${taskId}/items`),

  // Assign dataset to annotator
  assign: (datasetId, userId, projectId, timeLimitMinutes = 60) =>
    api.post("/tasks/assign", {
      datasetId: String(datasetId),
      projectId: String(projectId || ""),
      assignedTo: String(userId),
      timeLimitMinutes,
    }),

  // Submit completed task
  submit: (taskId) => api.post(`/tasks/${taskId}/submit`),
};

export const annotationAPI = {
  submit: (payload) => api.post("/annotations/submit", payload),
  skip: (payload) => api.post("/annotations/skip", payload),
  getByItem: (itemId) => api.get(`/tasks/items/${itemId}/annotations`),
  getByTask: (taskId) => api.get(`/tasks/${taskId}/annotations`),
  update: (annotationId, payload) => api.put(`/annotations/${annotationId}`, payload),
};

export const userAPI = {
  getAll: () => api.get("/users"),
  getById: (id) => api.get(`/users/${id}`),
};

export const roleAPI = {
  getAll: () => api.get("/roles"),
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
