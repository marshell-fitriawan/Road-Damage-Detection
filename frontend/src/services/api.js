import axios from "axios";

const API_BASE_URL = "https://api.geovision.risetmaster.my.id/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token from localStorage on startup
const token = localStorage.getItem("token");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      if (window.location.pathname !== "/login") {
        // Emit event agar App bisa tampilkan toast sebelum redirect
        window.dispatchEvent(new CustomEvent("session-expired"));
        setTimeout(() => {
          window.location.href = "/login";
        }, 1800);
      }
    }
    return Promise.reject(error);
  },
);

// ==================== AUTH SERVICE ====================
export const authService = {
  login: async (email, password) => {
    const response = await api.post("/login", { email, password });
    return response.data;
  },
  logout: async () => {
    const response = await api.post("/logout");
    return response.data;
  },
  me: async () => {
    const response = await api.get("/me");
    return response.data;
  },
  updateProfile: async (data) => {
    const response = await api.put("/profile", data);
    return response.data;
  },
  updatePassword: async (data) => {
    const response = await api.put("/profile/password", data);
    return response.data;
  },
};

// ==================== ROAD DAMAGE SERVICE ====================
export const roadDamageService = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(`/road-damages?${params.toString()}`);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/road-damages/${id}`);
    return response.data;
  },

  detect: async (formData) => {
    const response = await api.post("/road-damages/detect", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/road-damages/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/road-damages/${id}`);
    return response.data;
  },

  bulkDelete: async (ids) => {
    const response = await api.post("/road-damages/bulk-delete", { ids });
    return response.data;
  },

  getStatistics: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(
      `/road-damages/stats/summary?${params.toString()}`,
    );
    return response.data;
  },

  getMapMarkers: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(
      `/road-damages/map/markers?${params.toString()}`,
    );
    return response.data;
  },

  laporPerbaikan: async (id, formData) => {
    const response = await api.post(
      `/road-damages/${id}/lapor-perbaikan`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  approveRepair: async (id) => {
    const response = await api.post(`/road-damages/${id}/approve-repair`);
    return response.data;
  },

  rejectRepair: async (id) => {
    const response = await api.post(`/road-damages/${id}/reject-repair`);
    return response.data;
  },
};

// ==================== TRACKING SERVICE ====================
export const trackingService = {
  // routeData: { startPoint: {lat, lng}, endPoint: {lat, lng}, ruasJalanName: string|null }
  start: async (routeData = null) => {
    const payload = {};
    if (routeData?.startPoint) {
      payload.start_point = routeData.startPoint;
    }
    if (routeData?.endPoint) {
      payload.end_point = routeData.endPoint;
    }
    if (routeData?.ruasJalanName) {
      payload.ruas_jalan_name = routeData.ruasJalanName;
    }
    const response = await api.post("/tracking/start", payload);
    return response.data;
  },

  stop: async (sessionId) => {
    const response = await api.post(`/tracking/${sessionId}/stop`);
    return response.data;
  },

  updateRoute: async (sessionId, latitude, longitude) => {
    const response = await api.post(`/tracking/${sessionId}/route`, {
      latitude,
      longitude,
    });
    return response.data;
  },

  saveDamage: async (sessionId, data) => {
    const response = await api.post(`/tracking/${sessionId}/damage`, data);
    return response.data;
  },

  getActiveSession: async () => {
    const response = await api.get("/tracking/active");
    return response.data;
  },

  getMyHistory: async (page = 1) => {
    const response = await api.get(`/tracking/my-history?page=${page}`);
    return response.data;
  },

  getAllHistory: async (filters = {}) => {
    const params = new URLSearchParams();

    // Handle page parameter
    if (filters.page) {
      params.append("page", filters.page);
    }

    // Handle filter parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (
        key !== "page" &&
        value !== "" &&
        value !== null &&
        value !== undefined
      ) {
        params.append(key, value);
      }
    });

    const response = await api.get(`/tracking-all?${params.toString()}`);
    return response.data;
  },

  getSession: async (id) => {
    const response = await api.get(`/tracking/${id}`);
    return response.data;
  },

  // Admin: get all active tracking sessions for live map (real-time polling)
  getLiveSessions: async () => {
    const response = await api.get("/tracking-live");
    return response.data;
  },

  // Admin: delete single session (cascade deletes road damages)
  deleteSession: async (id) => {
    const response = await api.delete(`/tracking/${id}`);
    return response.data;
  },

  // Admin: bulk delete sessions
  bulkDeleteSessions: async (ids) => {
    const response = await api.post("/tracking-bulk-delete", { ids });
    return response.data;
  },
};

// ==================== USER MANAGEMENT SERVICE ====================
export const userService = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(`/users?${params.toString()}`);
    return response.data;
  },

  create: async (data) => {
    const response = await api.post("/users", data);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  toggleActive: async (id) => {
    const response = await api.post(`/users/${id}/toggle-active`);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default api;
