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
      const url = (error.config?.url || "").toLowerCase();
      const isAuthEndpoint =
        url.includes("/auth/login") ||
        url.includes("/auth/refresh") ||
        url.includes("/auth/me") ||
        url.includes("/me");

      // Only force-logout when the auth/session endpoint itself returns 401
      // (token truly expired). For resource endpoints (projects, tasks, etc.)
      // just reject the promise so components handle the error gracefully
      // without kicking the user back to login.
      if (isAuthEndpoint) {
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

const consensusRequestCache = new Map();

const resolveApiList = (response) => {
  const root = response?.data?.data ?? response?.data ?? response;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.Items)) return root.Items;
  if (Array.isArray(root?.results)) return root.results;
  if (Array.isArray(root?.Results)) return root.Results;
  if (Array.isArray(root?.tasks)) return root.tasks;
  if (Array.isArray(root?.Tasks)) return root.Tasks;
  if (Array.isArray(root?.data)) return root.data;
  if (Array.isArray(root?.Data)) return root.Data;

  // Common paginated wrappers
  if (Array.isArray(root?.page?.items)) return root.page.items;
  if (Array.isArray(root?.Page?.Items)) return root.Page.Items;
  if (Array.isArray(root?.payload?.items)) return root.payload.items;
  if (Array.isArray(root?.Payload?.Items)) return root.Payload.Items;

  // Last chance: scan first-level object values for an array
  if (root && typeof root === "object") {
    for (const value of Object.values(root)) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") {
        if (Array.isArray(value.items)) return value.items;
        if (Array.isArray(value.Items)) return value.Items;
        if (Array.isArray(value.results)) return value.results;
        if (Array.isArray(value.Results)) return value.Results;
        if (Array.isArray(value.data)) return value.data;
        if (Array.isArray(value.Data)) return value.Data;
      }
    }
  }

  return [];
};

export const reviewAPI = {
  getPendingReviews: async () => {
    const requestFactories = [
      () => api.get("/tasks"),
      () => api.get("/tasks", { params: { Status: "Opened" } }),
      () => api.get("/tasks", { params: { status: "opened" } }),
    ];

    let lastSuccessResponse = null;
    let lastError = null;

    for (const requestFactory of requestFactories) {
      try {
        const response = await requestFactory();
        lastSuccessResponse = response;

        if (resolveApiList(response).length > 0) {
          return response;
        }
      } catch (error) {
        lastError = error;
      }
    }

    if (lastSuccessResponse) {
      return lastSuccessResponse;
    }

    throw lastError;
  },
  // Temporarily disabled while backend /reviews endpoints are unstable.
  getAnnotationForReview: async () => ({ data: { data: null } }),
  approve: async () => ({ data: { success: true } }),
  reject: async () => ({ data: { success: true } }),
  submitBatchReview: async () => ({ data: { success: true } }),
  getAll: async () => ({ data: { data: [] } }),
  // POST /reviews – submit per-image review decision
  submit: (body) => api.post('/reviews', body),
};

export const projectAPI = {
  getById: (id) => api.get(`/projects/${id}`),
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

export const consensusAPI = {
  getByTaskItemId: (taskItemId) => {
    const key = String(taskItemId || "");
    const url = `/consensuses/task-items/${key}`;

    if (!key) {
      return Promise.reject(new Error("taskItemId is required for consensus request"));
    }

    if (consensusRequestCache.has(key)) {
      if (import.meta.env.DEV) {
        console.log(`Consensus cache hit: ${key}`);
      }
      return consensusRequestCache.get(key);
    }

    if (import.meta.env.DEV) {
      console.log(`API Request (explicit): GET ${url}`);
    }

    const requestPromise = api
      .get(url)
      .then((response) => {
        if (import.meta.env.DEV) {
          const payload = response?.data?.data ?? response?.data;
          const previewKeys =
            payload && typeof payload === "object" && !Array.isArray(payload)
              ? Object.keys(payload).slice(0, 12)
              : [];

          console.log("Consensus response meta:", {
            taskItemId,
            status: response?.status,
            hasPayload: payload != null,
            isArray: Array.isArray(payload),
            previewKeys,
          });
          console.log("Consensus response payload:", payload);
        }

        return response;
      })
      .catch((error) => {
        if (import.meta.env.DEV) {
          console.error("Consensus request failed:", {
            taskItemId,
            url,
            status: error?.response?.status,
            message: error?.message,
          });
          console.error("Consensus error payload:", error?.response?.data);
        }

        throw error;
      });

    consensusRequestCache.set(key, requestPromise);
    return requestPromise;
  },
};

export const categoryAPI = {
  getAll: () =>
    trySequential([
      () => api.get("/categories"),
      () => api.get("/Categories"),
    ]),
  getProjects: (categoryId) =>
    trySequential([
      () => api.get(`/categories/${categoryId}/projects`),
      () => api.get(`/Categories/${categoryId}/projects`),
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
  getAll: (params = {}) =>
    api.get("/labels", { params: { pageSize: 100, ...params } }),
  getByCategory: (categoryId) =>
    trySequential([
      () => api.get(`/categories/${categoryId}/labels`),
      () => api.get(`/Categories/${categoryId}/labels`),
      () => api.get(`/labelsets/${categoryId}/labels`),
    ]),
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
  addToProject: (projectId, labelId) =>
    api.post(`/labels/add/${projectId}`, { labelId }),
};

export default api;
