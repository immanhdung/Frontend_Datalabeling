import axios from 'axios';

// Base API URL - thay đổi theo môi trường
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ==================== AUTH APIs ====================
export const authAPI = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  register: (userData) => apiClient.post('/auth/register', userData),
  logout: () => apiClient.post('/auth/logout'),
  getCurrentUser: () => apiClient.get('/auth/me'),
  refreshToken: () => apiClient.post('/auth/refresh'),
};

// ==================== USER APIs ====================
export const userAPI = {
  getAll: (params) => apiClient.get('/users', { params }),
  getById: (id) => apiClient.get(`/users/${id}`),
  create: (userData) => apiClient.post('/users', userData),
  update: (id, userData) => apiClient.put(`/users/${id}`, userData),
  delete: (id) => apiClient.delete(`/users/${id}`),
  changeStatus: (id, status) => apiClient.patch(`/users/${id}/status`, { status }),
};

// ==================== PROJECT APIs ====================
export const projectAPI = {
  getAll: (params) => apiClient.get('/projects', { params }),
  getById: (id) => apiClient.get(`/projects/${id}`),
  create: (projectData) => apiClient.post('/projects', projectData),
  update: (id, projectData) => apiClient.put(`/projects/${id}`, projectData),
  delete: (id) => apiClient.delete(`/projects/${id}`),
  getStats: (id) => apiClient.get(`/projects/${id}/stats`),
  assignUsers: (id, userIds) => apiClient.post(`/projects/${id}/assign`, { userIds }),
};

// ==================== TASK APIs ====================
export const taskAPI = {
  getAll: (params) => apiClient.get('/tasks', { params }),
  getById: (id) => apiClient.get(`/tasks/${id}`),
  create: (taskData) => apiClient.post('/tasks', taskData),
  update: (id, taskData) => apiClient.put(`/tasks/${id}`, taskData),
  delete: (id) => apiClient.delete(`/tasks/${id}`),
  assign: (id, annotatorId) => apiClient.post(`/tasks/${id}/assign`, { annotatorId }),
  submit: (id, annotationData) => apiClient.post(`/tasks/${id}/submit`, annotationData),
  getMyTasks: () => apiClient.get('/tasks/my-tasks'),
};

// ==================== ANNOTATION APIs ====================
export const annotationAPI = {
  getAll: (params) => apiClient.get('/annotations', { params }),
  getById: (id) => apiClient.get(`/annotations/${id}`),
  create: (annotationData) => apiClient.post('/annotations', annotationData),
  update: (id, annotationData) => apiClient.put(`/annotations/${id}`, annotationData),
  delete: (id) => apiClient.delete(`/annotations/${id}`),
  submit: (id) => apiClient.post(`/annotations/${id}/submit`),
};

// ==================== REVIEW APIs (Reviewer) ====================
export const reviewAPI = {
  // Get all annotations pending review
  getPendingReviews: (params) => apiClient.get('/reviews/pending', { params }),
  
  // Get all reviews (with filters)
  getAll: (params) => apiClient.get('/reviews', { params }),
  
  // Get specific annotation for review
  getAnnotationForReview: (annotationId) => apiClient.get(`/reviews/annotation/${annotationId}`),
  
  // Approve annotation
  approve: (annotationId, reviewData) => apiClient.post(`/reviews/${annotationId}/approve`, reviewData),
  
  // Reject annotation
  reject: (annotationId, reviewData) => apiClient.post(`/reviews/${annotationId}/reject`, reviewData),
  
  // Get review history
  getHistory: (params) => apiClient.get('/reviews/history', { params }),
  
  // Get reviewer statistics
  getStats: () => apiClient.get('/reviews/stats'),
  
  // Get specific review details
  getById: (reviewId) => apiClient.get(`/reviews/${reviewId}`),
  
  // Update review
  update: (reviewId, reviewData) => apiClient.put(`/reviews/${reviewId}`, reviewData),
};

// ==================== DATASET APIs ====================
export const datasetAPI = {
  getAll: (params) => apiClient.get('/datasets', { params }),
  getById: (id) => apiClient.get(`/datasets/${id}`),
  create: (datasetData) => apiClient.post('/datasets', datasetData),
  update: (id, datasetData) => apiClient.put(`/datasets/${id}`, datasetData),
  delete: (id) => apiClient.delete(`/datasets/${id}`),
  upload: (id, formData) => apiClient.post(`/datasets/${id}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getItems: (id, params) => apiClient.get(`/datasets/${id}/items`, { params }),
};

// ==================== ADMIN APIs ====================
export const adminAPI = {
  // Dashboard stats
  getDashboardStats: () => apiClient.get('/admin/dashboard/stats'),
  
  // Activity logs
  getActivityLogs: (params) => apiClient.get('/admin/activity-logs', { params }),
  
  // System settings
  getSettings: () => apiClient.get('/admin/settings'),
  updateSettings: (settings) => apiClient.put('/admin/settings', settings),
  
  // System health
  getSystemHealth: () => apiClient.get('/admin/system/health'),
};

// ==================== ANALYTICS APIs ====================
export const analyticsAPI = {
  getProjectAnalytics: (projectId) => apiClient.get(`/analytics/project/${projectId}`),
  getUserAnalytics: (userId) => apiClient.get(`/analytics/user/${userId}`),
  getOverallStats: () => apiClient.get('/analytics/overall'),
  getTimeSeriesData: (params) => apiClient.get('/analytics/timeseries', { params }),
};

// ==================== NOTIFICATION APIs ====================
export const notificationAPI = {
  getAll: (params) => apiClient.get('/notifications', { params }),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
  delete: (id) => apiClient.delete(`/notifications/${id}`),
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
};

// Export the axios instance for custom requests
export default apiClient;
