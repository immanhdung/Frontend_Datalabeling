import axios from "axios";

const api = axios.create({
  baseURL: "https://labelhub-backend.onrender.com/api",
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
  assign: (taskId, userId) => api.post(`/tasks/${taskId}/assign`, { userId }),
};

export const userAPI = {
  getAll: () => api.get("/users"),
};

export default api;