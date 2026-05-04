/**
 * OAuthCallback.jsx
 *
 * Handles the generic OAuth callback flow. Extracts token, email, role, and
 * userId from the URL parameters, stores them via AuthContext, and redirects
 * the user based on their role.
 *
 * Migrated to a shadcn-themed loader. Behavior unchanged.
 */

import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';

function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const role = searchParams.get('role');
  const userId = searchParams.get('userId');

  useEffect(() => {
    if (token && email && role) {
      login({ userId, email, role, accessToken: token });

      if (role === 'Participant') {
        navigate(`/profile/${email}`);
      } else if (role === 'Organizer') {
        navigate(`/OrganizerDashboard/${email}`);
      } else {
        navigate('/');
      }
    } else {
      toast.error('Missing required info from OAuth redirect.');
      navigate('/');
    }
  }, [token, email, role, userId, navigate, login]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Logging you in via OAuth…</p>
      </div>
    </div>
  );
}

export default OAuthCallback;
