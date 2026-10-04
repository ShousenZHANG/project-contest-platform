/**
 * Centralized Axios instance for all API calls.
 *
 * - Base URL: VITE_API_BASE_URL, defaulting to the API gateway on :8080
 * - Request interceptor: attaches auth headers through AuthTokenManager
 * - Responses from a previous session are discarded
 * - A 401 for the current token expires that session and redirects to /login
 */

import axios, { CanceledError } from "axios";
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
    config.sessionVersion = AuthTokenManager.getSessionVersion();
    Object.assign(config.headers, AuthTokenManager.getAuthHeaders());

    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
  // Capture identity before the caller can log out or switch accounts.
  { synchronous: true }
);

// Handle expired or invalid sessions at the shared HTTP seam.
function belongsToCurrentSession(config) {
  return config?.sessionVersion === AuthTokenManager.getSessionVersion();
}

function sessionChanged(config) {
  return new CanceledError('The session changed while the request was in flight', config);
}

apiClient.interceptors.response.use(
  (response) => {
    if (!belongsToCurrentSession(response.config)) {
      return Promise.reject(sessionChanged(response.config));
    }
    return response;
  },
  (error) => {
    if (error.config && !belongsToCurrentSession(error.config)) {
      return Promise.reject(sessionChanged(error.config));
    }
    if (error.response?.status === 401 &&
        error.config?.headers?.get('Authorization') === `Bearer ${AuthTokenManager.getToken()}` &&
        AuthTokenManager.isAuthenticated()) {
      AuthTokenManager.clearSession();
      if (typeof window !== 'undefined' && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
