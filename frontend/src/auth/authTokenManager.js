/**
 * AuthTokenManager is the single source of truth for auth session state.
 * Components and API adapters should use this module instead of touching
 * localStorage directly.
 */
const KEYS = {
  TOKEN: 'token',
  USER_ID: 'userId',
  EMAIL: 'email',
  ROLE: 'role',
};

const AUTH_SESSION_CHANGED = 'auth-session-changed';
let currentSession;
let sessionVersion = 0;

function getSession() {
  const next = {
    token: read(KEYS.TOKEN),
    userId: read(KEYS.USER_ID),
    email: read(KEYS.EMAIL),
    role: read(KEYS.ROLE),
  };

  if (!currentSession || Object.keys(next).some(key => next[key] !== currentSession[key])) {
    if (currentSession && ['token', 'userId', 'role'].some(key => next[key] !== currentSession[key])) {
      sessionVersion += 1;
    }
    currentSession = Object.freeze(next);
  }
  return currentSession;
}

function getStorage() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
}

function read(key) {
  return getStorage()?.getItem(key) ?? null;
}

function write(key, value) {
  const storage = getStorage();
  if (!storage) return;
  if (value === undefined || value === null || value === '') {
    storage.removeItem(key);
    return;
  }
  storage.setItem(key, value);
}

function notifySessionChanged() {
  // Record every transition even when no React tree is currently subscribed.
  getSession();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(AUTH_SESSION_CHANGED));
  }
}

const AuthTokenManager = {
  getToken: () => read(KEYS.TOKEN),
  getUserId: () => read(KEYS.USER_ID),
  getEmail: () => read(KEYS.EMAIL),
  getRole: () => read(KEYS.ROLE),

  setSession: ({ token, userId, email, role }) => {
    write(KEYS.TOKEN, token);
    write(KEYS.USER_ID, userId);
    write(KEYS.EMAIL, email);
    write(KEYS.ROLE, role);
    notifySessionChanged();
  },

  clearSession: () => {
    const storage = getStorage();
    if (storage) {
      Object.values(KEYS).forEach(key => storage.removeItem(key));
    }
    notifySessionChanged();
  },

  isAuthenticated: () => Boolean(read(KEYS.TOKEN)),

  // A stable snapshot also lets React subscribe without duplicating session state.
  getSession,

  getSessionVersion: () => {
    getSession();
    return sessionVersion;
  },

  getAuthHeaders: () => {
    const token = read(KEYS.TOKEN);
    const userId = read(KEYS.USER_ID);
    const role = read(KEYS.ROLE);

    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(userId ? { 'User-ID': userId } : {}),
      ...(role ? { 'User-Role': role } : {}),
    };
  },

  subscribe: (listener) => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    let previous = getSession();
    const handler = (event) => {
      if (event.type === 'storage' &&
          ((event.key !== null && !Object.values(KEYS).includes(event.key)) ||
           (event.storageArea && event.storageArea !== getStorage()))) {
        return;
      }
      const next = getSession();
      if (next === previous) return;
      previous = next;
      listener(next);
    };
    window.addEventListener(AUTH_SESSION_CHANGED, handler);
    window.addEventListener('storage', handler);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED, handler);
      window.removeEventListener('storage', handler);
    };
  },
};

export default AuthTokenManager;
export { AUTH_SESSION_CHANGED, KEYS };
