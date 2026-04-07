/**
 * OAuthCallback.js
 * 
 * This component handles the generic OAuth callback flow.
 * It extracts the token, email, role, and userId from the URL parameters,
 * stores them in localStorage, and redirects the user based on their role:
 * Participant → Profile page, Organizer → Organizer Dashboard, otherwise → Home page.
 * If required parameters are missing, it shows an alert and redirects to home.
 * 
 * Developer: Zhaoyi Yang
 */


import { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
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
      alert('Missing required info from OAuth redirect.');
      navigate('/');
    }
  }, [token, email, role, userId, navigate, login]);

  return <p>Logging you in via OAuth...</p>;
}

export default OAuthCallback;