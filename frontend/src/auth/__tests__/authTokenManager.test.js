import AuthTokenManager, { KEYS } from '../authTokenManager';

describe('AuthTokenManager', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setSession', () => {
    it('persists every field of the session under the canonical keys', () => {
      AuthTokenManager.setSession({
        token: 't-123',
        userId: 'u-1',
        email: 'a@b.com',
        role: 'PARTICIPANT',
      });

      expect(localStorage.getItem(KEYS.TOKEN)).toBe('t-123');
      expect(localStorage.getItem(KEYS.USER_ID)).toBe('u-1');
      expect(localStorage.getItem(KEYS.EMAIL)).toBe('a@b.com');
      expect(localStorage.getItem(KEYS.ROLE)).toBe('PARTICIPANT');
    });
  });

  describe('getSession', () => {
    it('returns the persisted session as one object', () => {
      AuthTokenManager.setSession({
        token: 't',
        userId: 'u',
        email: 'e',
        role: 'JUDGE',
      });

      expect(AuthTokenManager.getSession()).toEqual({
        token: 't',
        userId: 'u',
        email: 'e',
        role: 'JUDGE',
      });
    });

    it('returns nulls for every field when nothing is stored', () => {
      expect(AuthTokenManager.getSession()).toEqual({
        token: null,
        userId: null,
        email: null,
        role: null,
      });
    });
  });

  describe('clearSession', () => {
    it('removes every key the manager owns', () => {
      AuthTokenManager.setSession({
        token: 't',
        userId: 'u',
        email: 'e',
        role: 'ADMIN',
      });

      AuthTokenManager.clearSession();

      expect(localStorage.getItem(KEYS.TOKEN)).toBeNull();
      expect(localStorage.getItem(KEYS.USER_ID)).toBeNull();
      expect(localStorage.getItem(KEYS.EMAIL)).toBeNull();
      expect(localStorage.getItem(KEYS.ROLE)).toBeNull();
    });

    it('does not throw when the session was never set', () => {
      expect(() => AuthTokenManager.clearSession()).not.toThrow();
    });
  });

  describe('isAuthenticated', () => {
    it('is true when a token is present', () => {
      AuthTokenManager.setSession({
        token: 't',
        userId: 'u',
        email: 'e',
        role: 'ADMIN',
      });
      expect(AuthTokenManager.isAuthenticated()).toBe(true);
    });

    it('is false when no token is present', () => {
      expect(AuthTokenManager.isAuthenticated()).toBe(false);
    });

    it('is false after clearSession', () => {
      AuthTokenManager.setSession({
        token: 't',
        userId: 'u',
        email: 'e',
        role: 'ADMIN',
      });
      AuthTokenManager.clearSession();
      expect(AuthTokenManager.isAuthenticated()).toBe(false);
    });
  });

  describe('individual getters', () => {
    beforeEach(() => {
      AuthTokenManager.setSession({
        token: 't',
        userId: 'u',
        email: 'e',
        role: 'PARTICIPANT',
      });
    });

    it('getToken returns the token only', () => {
      expect(AuthTokenManager.getToken()).toBe('t');
    });
    it('getUserId returns the user id only', () => {
      expect(AuthTokenManager.getUserId()).toBe('u');
    });
    it('getEmail returns the email only', () => {
      expect(AuthTokenManager.getEmail()).toBe('e');
    });
    it('getRole returns the role only', () => {
      expect(AuthTokenManager.getRole()).toBe('PARTICIPANT');
    });
  });
});
