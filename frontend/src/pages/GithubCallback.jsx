/**
 * GithubCallback.jsx
 *
 * Handles the OAuth callback after GitHub authentication. Exchanges the
 * authorization code for a token via the backend API, stores user info via
 * AuthContext, and redirects to the participant profile.
 *
 * Migrated to a shadcn-themed loader. Behavior unchanged.
 */

import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';

function GithubIcon({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="currentColor"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.26.82-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.082-.73.082-.73 1.205.085 1.838 1.237 1.838 1.237 1.07 1.835 2.807 1.305 3.492.998.108-.776.42-1.305.763-1.605-2.665-.305-5.467-1.332-5.467-5.93 0-1.31.467-2.382 1.235-3.222-.123-.303-.535-1.524.117-3.176 0 0 1.008-.323 3.3 1.23a11.5 11.5 0 0 1 3.003-.404c1.018.005 2.043.138 3.003.404 2.29-1.553 3.297-1.23 3.297-1.23.653 1.652.24 2.873.118 3.176.77.84 1.233 1.912 1.233 3.222 0 4.61-2.806 5.622-5.48 5.92.43.37.812 1.102.812 2.222 0 1.605-.014 2.898-.014 3.293 0 .32.216.694.825.576C20.565 21.795 24 17.297 24 12c0-6.63-5.373-12-12-12z" />
    </svg>
  );
}

function GithubCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await apiClient.get(
          `/users/oauth/callback/github?code=${code}&state=${state}`
        );
        const data = res.data;
        login({
          userId: data.userId,
          email: data.email,
          role: data.role,
          accessToken: data.accessToken,
        });
        navigate(`/profile/${data.email}`);
      } catch (err) {
        toast.error(err.response?.data?.message || 'GitHub login failed');
        navigate('/');
      }
    };

    if (code && state) {
      fetchToken();
    }
  }, [code, state, navigate, login]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="relative">
          <GithubIcon className="h-8 w-8 text-foreground" />
          <Loader2 className="absolute -right-3 -bottom-1 h-4 w-4 animate-spin text-primary" />
        </div>
        <p className="text-sm">Logging you in with GitHub…</p>
      </div>
    </div>
  );
}

export default GithubCallback;
