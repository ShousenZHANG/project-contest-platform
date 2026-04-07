/**
 * GoogleCallback.js
 *
 * Handles the OAuth callback after Google authentication.
 * Exchanges authorization code for token via backend API,
 * stores user info via AuthContext, and redirects to profile.
 *
 * Developer: Zhaoyi Yang
 */


import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
        const res = await apiClient.get(`/users/oauth/callback/google?code=${code}&state=${state}`);
        const data = res.data;
        login({
          userId: data.userId,
          email: data.email,
          role: data.role,
          accessToken: data.accessToken,
        });
        navigate(`/profile/${data.email}`);
      } catch (err) {
        alert(err.response?.data?.message || 'Google login failed');
        navigate('/');
      }
    };

    if (code && state) {
      fetchToken();
    }
  }, [code, state, navigate, login]);

  return <p>Logging you in with Google...</p>;
}

export default GoogleCallback;
