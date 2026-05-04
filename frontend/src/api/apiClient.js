/**
 * Centralized Axios instance for all API calls.
 *
 * - Base URL: http://localhost:8080 (API gateway)
 * - Request interceptor: auto-attaches JWT Bearer token from localStorage
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

// ── Request interceptor: attach JWT ─────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = AuthTokenManager.getToken();
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 ────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear storage and redirect to login
      AuthTokenManager.clearSession();
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
