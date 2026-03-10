import axios from "axios";

export const API_BASE_URL =
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
  getAll: () =>
    trySequential([
      () => api.get("/tasks"),
      () => api.get("/Tasks"),
    ]),
  assign: (taskId, userId) =>
    trySequential([
      () => api.post(`/tasks/${taskId}/assign`, { userId }),
      () => api.post(`/tasks/${taskId}/assign`, { annotatorId: userId }),
      () => api.post(`/tasks/${taskId}/assign`, { assignedTo: userId }),
      () => api.post(`/tasks/${taskId}/assign`, { assigned_to: userId }),
      () => api.post(`/tasks/${taskId}/assign`, { assigneeId: userId }),
      () => api.put(`/tasks/${taskId}/assign`, { userId }),
      () => api.patch(`/tasks/${taskId}/assign`, { userId }),
      () => api.post(`/projects/${taskId}/members/${userId}`, {}),
      () => api.post(`/Tasks/${taskId}/assign`, { userId }),
      () => api.post(`/tasks/${taskId}/Assign`, { userId }),
    ]),
  getMyTasks: () =>
    trySequential([
      () => api.get("/tasks/my-tasks"),
      () => api.get("/tasks/my"),
      () => api.get("/tasks/assigned"),
      () => api.get("/tasks?assignedOnly=true"),
    ]),
  getById: (taskId) => api.get(`/tasks/${taskId}`),
  submit: (taskId, payload) =>
    trySequential([
      () => api.post(`/tasks/${taskId}/submit`, payload),
      () => api.put(`/tasks/${taskId}/submit`, payload),
      () => api.patch(`/tasks/${taskId}`, payload),
    ]),
};

export const annotationAPI = {
  create: (payload) =>
    trySequential([
      () => api.post("/annotations", payload),
      () => api.post("/annotation", payload),
    ]),
};

export const userAPI = {
  getAll: () =>
    trySequential([
      () => api.get("/users"),
      () => api.get("/Users"),
    ]),
};

export const roleAPI = {
  getAll: () =>
    trySequential([
      () => api.get("/roles"),
      () => api.get("/Roles"),
    ]),
};

export const datasetAPI = {
  getAll: () => trySequential([() => api.get("/datasets"), () => api.get("/Datasets")]),
  getById: (id) => trySequential([() => api.get(`/datasets/${id}`), () => api.get(`/Datasets/${id}`)]),
  getItems: (id) => trySequential([() => api.get(`/datasets/${id}/items`), () => api.get(`/Datasets/${id}/items`)]),
  attach: (datasetId, projectId) =>
    trySequential([
      () => api.post(`/datasets/${datasetId}/attach/${projectId}`),
      () => api.post(`/Datasets/${datasetId}/attach/${projectId}`),
      () => api.post(`/datasets/add/${projectId}`, { datasetId }),
      () => api.post(`/Datasets/add/${projectId}`, { datasetId }),
      () => api.post(`/projects/${projectId}/datasets`, { datasetId }),
    ]),
};

export default api;