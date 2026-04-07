/**
 * ResetPassword.js
 *
 * This component allows users to reset their password using a secure token.
 * It validates the new password for strength and ensures confirmation matches.
 * Upon successful reset, the user is redirected to the homepage.
 *
 * Developer: Zhaoyi Yang
 */


import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import './ResetPassword.css';
import apiClient from '../api/apiClient';

const REDIRECT_DELAY_MS = 3000;

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      setError('Password must be at least 8 characters long, include at least one uppercase letter and one number.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match!');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/users/reset-password', { token, newPassword });
      setSuccessMessage('Password has been reset successfully! Redirecting...');
      setTimeout(() => navigate('/'), REDIRECT_DELAY_MS);
    } catch (err) {
      const msg = err.response?.data?.message || 'Reset failed. Please try again later.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reset-password-container">
      <h2 className="reset-title">Reset Your Password</h2>
      <form onSubmit={handleSubmit} className="reset-password-form">
        <label>New Password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />

        <label>Confirm Password</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Resetting...' : 'Reset Password'}
        </button>
        {error && <p className="error-message">{error}</p>}
        {successMessage && <p className="success-message">{successMessage}</p>}
      </form>
    </div>
  );
}

export default ResetPassword;
