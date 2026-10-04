import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

/** Consume the fragment once; legacy query callbacks remain compatible. */
export default function OAuthCallback() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const consumed = useRef(false);
  const [credentials] = useState(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const params = fragment.has('error') || fragment.has('token') ? fragment : query;
    return { failed: params.has('error'), error: params.get('error'), token: params.get('token'), email: params.get('email'), role: params.get('role'), userId: params.get('userId') };
  });
  useLayoutEffect(() => {
    // Remove credentials before paint and retain React Router's history state.
    window.history.replaceState(window.history.state, '', window.location.pathname);
  }, []);
  useEffect(() => {
    if (consumed.current) return;
    consumed.current = true;
    if (credentials.failed) {
      const error = credentials.error?.trim() || 'OAuth sign-in could not be completed.';
      toast.error(error);
      navigate('/login', { replace: true, state: { oauthError: error } });
      return;
    }
    const { token, email, userId } = credentials;
    const role = credentials.role?.toUpperCase();
    if (!token || !email || !userId || !['PARTICIPANT', 'ORGANIZER', 'JUDGE', 'ADMIN'].includes(role)) {
      toast.error('OAuth sign-in information is incomplete. Please sign in again.');
      navigate('/login', { replace: true });
      return;
    }
    login({ userId, email, role, accessToken: token });
    const profileEmail = encodeURIComponent(email);
    const destinations = {
      PARTICIPANT: `/profile/${profileEmail}`,
      ORGANIZER: `/OrganizerDashboard/${profileEmail}`,
      JUDGE: '/judge',
      ADMIN: '/AdminDashboard',
    };
    navigate(destinations[role], { replace: true });
  }, [credentials, navigate, login]);
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <p className="text-sm">Logging you in via OAuth…</p>
      </div>
    </div>
  );
}
