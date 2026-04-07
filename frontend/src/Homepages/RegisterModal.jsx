/**
 * @file RegisterModal.js
 * @description
 * This component renders the user registration modal for the platform.
 * It allows users to:
 *  - Register a new account by providing name, email, password, and confirming password.
 *  - Validate password strength and matching before submitting.
 *  - Register via OAuth providers (GitHub and Google) with role-specific authorization.
 *
 * Upon successful registration:
 *  - User information is stored via AuthContext.
 *  - Users are redirected to their corresponding profile page based on their role.
 *
 * Developer: Beiqi Dai, Zhaoyi Yang, Ziqi Yi
 */


import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RegisterModal.css";
import apiClient from '../api/apiClient';
import { useAuth } from "../context/AuthContext";

const RegisterModal = ({ onClose, role }) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setError("Passwords do not match, please re-enter!");
      return;
    }

    const passwordRegex = /^(?=.*[A-Z]).{8,}$/;
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 8 characters and include at least one uppercase letter.");
      return;
    }

    setError("");

    try {
      const res = await apiClient.post("/users/register", { name, email, password, role });
      const data = res.data;

      login({
        userId: data.userId,
        email: data.email,
        role: data.role,
        accessToken: data.accessToken,
      });

      if (data.role === "Participant") {
        navigate(`/profile/${data.email}`);
      } else if (data.role === "Organizer") {
        navigate(`/OrganizerProfile/${data.email}`);
      } else {
        navigate("/");
      }

      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || "Server error. Please try again later.";
      setError(msg);
    }
  };

  return (
    <div className="register-overlay">
      <div className="register-modal">
        <h3 className="register-title">Sign Up</h3>
        <button className="close-btn" onClick={onClose}>x</button>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Name</label>
            <input
              type="text"
              id="username"
              placeholder="Your name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Your email</label>
            <input
              type="email"
              id="email"
              placeholder="name@company.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              placeholder="********"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="********"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {error && (
              <p className="error-text" style={{ color: "red", fontSize: "0.9em" }}>
                {error}
              </p>
            )}
          </div>

          <div className="button-group">
            <button type="submit" className="register-button">
              Create Account
            </button>
          </div>

          <div className="oauth-section">
            <button
              type="button"
              className="github-login-button"
              onClick={() => window.location.href = `/users/oauth/github?role=${role}`}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/9/91/Octicons-mark-github.svg"
                alt="GitHub"
                className="github-icon"
              />
              Continue with GitHub
            </button>
          </div>

          <div className="oauth-section">
            <button
              type="button"
              className="google-login-button"
              onClick={() => window.location.href = `/users/oauth/google?role=${role}`}
            >
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="google-icon"
              />
              Continue with Google
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterModal;
