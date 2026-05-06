/**
 * Centralized Axios instance for all API calls.
 *
 * - Base URL: VITE_API_BASE_URL, defaulting to the API gateway on :8080
 * - Request interceptor: attaches auth headers through AuthTokenManager
 * - Response interceptor: clears auth state and redirects to /login on 401
 */

import axios from "axios";
import AuthTokenManager from '../auth/authTokenManager';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach auth context for direct service calls and gateway-routed requests.
apiClient.interceptors.request.use(
  (config) => {
    Object.assign(config.headers, AuthTokenManager.getAuthHeaders());

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Handle expired or invalid sessions at the shared HTTP seam.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      AuthTokenManager.clearSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
