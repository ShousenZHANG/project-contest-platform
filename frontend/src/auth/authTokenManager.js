/**
 * AuthTokenManager — single source of truth for auth token lifecycle.
 * All reads/writes/clears of auth state go through here.
 */
const KEYS = {
  TOKEN: 'token',
  USER_ID: 'userId',
  EMAIL: 'email',
  ROLE: 'role',
};

const AuthTokenManager = {
  getToken: () => localStorage.getItem(KEYS.TOKEN),
  getUserId: () => localStorage.getItem(KEYS.USER_ID),
  getEmail: () => localStorage.getItem(KEYS.EMAIL),
  getRole: () => localStorage.getItem(KEYS.ROLE),

  setSession: ({ token, userId, email, role }) => {
    localStorage.setItem(KEYS.TOKEN, token);
    localStorage.setItem(KEYS.USER_ID, userId);
    localStorage.setItem(KEYS.EMAIL, email);
    localStorage.setItem(KEYS.ROLE, role);
  },

  clearSession: () => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
  },

  isAuthenticated: () => Boolean(localStorage.getItem(KEYS.TOKEN)),

  getSession: () => ({
    token: localStorage.getItem(KEYS.TOKEN),
    userId: localStorage.getItem(KEYS.USER_ID),
    email: localStorage.getItem(KEYS.EMAIL),
    role: localStorage.getItem(KEYS.ROLE),
  }),
};

export default AuthTokenManager;
export { KEYS };
