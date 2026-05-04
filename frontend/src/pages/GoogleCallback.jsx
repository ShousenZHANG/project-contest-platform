/**
 * GoogleCallback.jsx
 *
 * Handles the OAuth callback after Google authentication. Exchanges the
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

function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const res = await apiClient.get(
          `/users/oauth/callback/google?code=${code}&state=${state}`
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
        toast.error(err.response?.data?.message || 'Google login failed');
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Logging you in with Google…</p>
      </div>
    </div>
  );
}

export default GoogleCallback;
