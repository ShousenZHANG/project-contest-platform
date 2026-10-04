import React, { useEffect } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

import AuthTokenManager from '../authTokenManager';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import { QueryProvider } from '../../providers/QueryProvider';
import apiClient from '../../api/apiClient';
import { queryKeys } from '../../api/queryKeys';
import { userService } from '../../services/userService';

const SESSION_A = { userId: 'a', email: 'a@example.com', role: 'PARTICIPANT', accessToken: 'token-a' };
const SESSION_B = { userId: 'b', email: 'b@example.com', role: 'PARTICIPANT', accessToken: 'token-b' };
const profileKey = queryKeys.users.profile();

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function response(config, data = null) {
  return { config, data, status: 200, statusText: 'OK', headers: {} };
}

function unauthorized(config) {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, {
    ...response(config), status: 401,
  });
}

describe('session lifecycle through the app providers and HTTP client', () => {
  const originalAdapter = apiClient.defaults.adapter;
  let current;
  let beforeMutation;

  function Probe() {
    const auth = useAuth();
    const client = useQueryClient();
    current = { ...auth, client };
    const { data } = useQuery({ queryKey: profileKey, queryFn: () => null, enabled: false });
    const mutation = useMutation({
      mutationFn: () => userService.updateProfile({ name: 'updated' }),
      onMutate: () => beforeMutation?.promise,
      onError: () => client.setQueryData(profileKey, { name: 'restored A' }),
    });
    return (
      <>
        <span>{auth.user?.userId ?? 'guest'}</span>
        <span>{data?.name ?? 'empty profile'}</span>
        <button onClick={() => mutation.mutate()}>Save</button>
      </>
    );
  }

  function mount() {
    return render(<QueryProvider><AuthProvider><Probe /></AuthProvider></QueryProvider>);
  }

  beforeEach(() => {
    localStorage.clear();
    beforeMutation = undefined;
    window.history.replaceState({}, '', '/login');
    apiClient.defaults.adapter = jest.fn(config => Promise.resolve(response(config)));
  });

  afterEach(() => {
    cleanup();
    apiClient.defaults.adapter = originalAdapter;
    localStorage.clear();
  });

  it('isolates private cache on account changes and retains it for unchanged sessions', () => {
    mount();
    act(() => current.login(SESSION_A));
    const clientA = current.client;
    act(() => clientA.setQueryData(profileKey, { name: 'private A' }));

    act(() => {
      current.login(SESSION_A);
      window.dispatchEvent(new StorageEvent('storage', { key: 'theme' }));
      AuthTokenManager.setSession({ ...AuthTokenManager.getSession(), email: 'updated@example.com' });
    });
    expect(current.client).toBe(clientA);
    expect(screen.getByText('private A')).toBeInTheDocument();

    act(() => current.login(SESSION_B));
    expect(current.client).not.toBe(clientA);
    expect(current.client.getQueryData(profileKey)).toBeUndefined();
    expect(clientA.getQueryData(profileKey)).toBeUndefined();
    expect(screen.getByText('b')).toBeInTheDocument();
    expect(screen.queryByText('private A')).not.toBeInTheDocument();
  });

  it.each(['network failure', '401'])(
    'clears local session and cache immediately when server logout returns %s', async (failure) => {
      mount();
      act(() => current.login(SESSION_A));
      const clientA = current.client;
      act(() => clientA.setQueryData(profileKey, { name: 'private A' }));
      const pending = deferred();
      apiClient.defaults.adapter = jest.fn(() => pending.promise);

      let logout;
      act(() => { logout = current.logout(); });

      const config = apiClient.defaults.adapter.mock.calls[0][0];
      expect(config.url).toBe('/users/logout');
      expect(config.headers.get('Authorization')).toBe('Bearer token-a');
      expect(AuthTokenManager.getToken()).toBeNull();
      expect(screen.getByText('guest')).toBeInTheDocument();
      expect(clientA.getQueryData(profileKey)).toBeUndefined();

      act(() => current.login(SESSION_B));
      pending.reject(failure === '401'
        ? unauthorized(config)
        : new AxiosError('Network Error', 'ERR_NETWORK', config));
      await expect(logout).resolves.toBeUndefined();
      expect(current.user.userId).toBe('b');
      expect(AuthTokenManager.getToken()).toBe('token-b');
    }
  );

  it('revokes the captured token on successful logout without exposing its old response', async () => {
    mount();
    act(() => current.login(SESSION_A));

    let logout;
    act(() => { logout = current.logout(); });
    await expect(logout).resolves.toBeUndefined();
    expect(apiClient.defaults.adapter.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer token-a');
    expect(current.isAuthenticated).toBe(false);
  });

  it('discards an old successful HTTP response instead of exposing it to the new account', async () => {
    mount();
    act(() => current.login(SESSION_A));
    const pending = deferred();
    apiClient.defaults.adapter = jest.fn(() => pending.promise);
    const request = userService.getProfile();
    const config = apiClient.defaults.adapter.mock.calls[0][0];
    const assertion = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });

    act(() => current.login(SESSION_B));
    pending.resolve(response(config, { name: 'private A' }));
    await assertion;
    expect(current.user.userId).toBe('b');
    expect(current.client.getQueryData(profileKey)).toBeUndefined();
  });

  it('rejects an old request after logout and re-login with the same token without a mounted provider', async () => {
    const persisted = { ...SESSION_A, token: SESSION_A.accessToken };
    AuthTokenManager.setSession(persisted);
    const pending = deferred();
    apiClient.defaults.adapter = jest.fn(() => pending.promise);
    const request = userService.getProfile();
    const config = apiClient.defaults.adapter.mock.calls[0][0];
    const assertion = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });

    AuthTokenManager.clearSession();
    AuthTokenManager.setSession(persisted);
    pending.resolve(response(config, { name: 'stale profile' }));
    await assertion;
    expect(AuthTokenManager.getToken()).toBe('token-a');
  });

  it('does not let an old 401 sign out a newly logged-in account', async () => {
    mount();
    act(() => current.login(SESSION_A));
    const pending = deferred();
    apiClient.defaults.adapter = jest.fn(() => pending.promise);
    const request = userService.getProfile();
    const config = apiClient.defaults.adapter.mock.calls[0][0];
    const assertion = expect(request).rejects.toMatchObject({ code: 'ERR_CANCELED' });

    act(() => current.login(SESSION_B));
    pending.reject(unauthorized(config));
    await assertion;
    expect(current.user.userId).toBe('b');
    expect(AuthTokenManager.getToken()).toBe('token-b');
  });

  it('expires the current session and private cache on a current authenticated 401', async () => {
    mount();
    act(() => current.login(SESSION_A));
    const clientA = current.client;
    act(() => clientA.setQueryData(profileKey, { name: 'private A' }));
    apiClient.defaults.adapter = config => Promise.reject(unauthorized(config));

    await act(async () => {
      await expect(userService.getProfile()).rejects.toMatchObject({ response: { status: 401 } });
    });
    expect(current.user).toBeNull();
    expect(clientA.getQueryData(profileKey)).toBeUndefined();
    expect(screen.getByText('guest')).toBeInTheDocument();
  });

  it('isolates a late optimistic rollback in the previous account cache', async () => {
    mount();
    act(() => current.login(SESSION_A));
    const clientA = current.client;
    const pending = deferred();
    apiClient.defaults.adapter = jest.fn(() => pending.promise);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(apiClient.defaults.adapter).toHaveBeenCalled());
    const config = apiClient.defaults.adapter.mock.calls[0][0];

    act(() => {
      current.login(SESSION_B);
    });
    act(() => current.client.setQueryData(profileKey, { name: 'private B' }));
    pending.reject(new AxiosError('Network Error', 'ERR_NETWORK', config));

    await waitFor(() => expect(clientA.getQueryData(profileKey)).toEqual({ name: 'restored A' }));
    expect(current.client.getQueryData(profileKey)).toEqual({ name: 'private B' });
    expect(screen.queryByText('restored A')).not.toBeInTheDocument();
  });

  it('stops a mutation awaiting optimistic work from sending with the next account token', async () => {
    mount();
    act(() => current.login(SESSION_A));
    const clientA = current.client;
    beforeMutation = deferred();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(apiClient.defaults.adapter).not.toHaveBeenCalled();

    act(() => current.login(SESSION_B));
    act(() => current.client.setQueryData(profileKey, { name: 'private B' }));
    beforeMutation.resolve();

    await waitFor(() => expect(clientA.getQueryData(profileKey)).toEqual({ name: 'restored A' }));
    expect(apiClient.defaults.adapter).not.toHaveBeenCalled();
    expect(current.client.getQueryData(profileKey)).toEqual({ name: 'private B' });
  });

  it('responds to cross-tab logout while ignoring unrelated storage changes', () => {
    mount();
    act(() => current.login(SESSION_A));
    const clientA = current.client;
    act(() => clientA.setQueryData(profileKey, { name: 'private A' }));

    act(() => {
      localStorage.clear();
      window.dispatchEvent(new StorageEvent('storage', { key: null }));
    });
    expect(current.user).toBeNull();
    expect(clientA.getQueryData(profileKey)).toBeUndefined();
    expect(screen.queryByText('private A')).not.toBeInTheDocument();
  });

  it('keeps the cache through StrictMode effect replay and normal rerenders', () => {
    const tree = <React.StrictMode><QueryProvider><AuthProvider><Probe /></AuthProvider></QueryProvider></React.StrictMode>;
    const view = render(tree);
    act(() => current.login(SESSION_A));
    const client = current.client;
    act(() => client.setQueryData(profileKey, { name: 'private A' }));
    view.rerender(tree);

    expect(current.client).toBe(client);
    expect(client.getQueryData(profileKey)).toEqual({ name: 'private A' });
  });

  it('observes a login completed by a child mount effect before the cache subscription starts', () => {
    let originalClient;
    function OAuthCallback() {
      const { login } = useAuth();
      const client = useQueryClient();
      originalClient ??= client;
      useEffect(() => login(SESSION_A), [login]);
      return <Probe />;
    }
    render(<QueryProvider><AuthProvider><OAuthCallback /></AuthProvider></QueryProvider>);

    expect(current.user.userId).toBe('a');
    expect(current.client).not.toBe(originalClient);
  });
});
