/**
 * PTopBar.js
 * 
 * Top navigation bar for participants.
 * Displays project logo, user avatar, welcome message, and a logout button.
 * Supports avatar click to navigate to user profile and logout confirmation dialog.
 * 
 * Role: Participant
 * Developer: Beiqi Dai
 */


import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogOut } from 'react-icons/fi';
import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Button } from '@mui/material';
import logo from './LOGO.png';
import './PTopBar.css';
import apiClient from '../../api/apiClient';

function TopBar() {
  const [open, setOpen] = useState(false);
  const [, setProjectName] = useState(localStorage.getItem("projectName") || "Please set a project name");
  const [avatarUrl, setAvatarUrl] = useState('');
  const navigate = useNavigate();
  const userName = localStorage.getItem('email') || 'Participant';

  useEffect(() => {
    const fetchProjectName = async () => {
      try {
        const res = await apiClient.get('/api/project/info');
        const data = res.data;
        if (data.success && data.projectName) {
          localStorage.setItem("projectName", `Welcome To ${data.projectName}`);
          setProjectName(`Welcome To ${data.projectName}`);
        }
      } catch {
        setProjectName("Please set a project name");
      }
    };

    if (!localStorage.getItem("projectName")) {
      fetchProjectName();
    }

    window.addEventListener("storage", () => {
      setProjectName(localStorage.getItem("projectName") || "Please set a project name");
    });

    return () => {
      window.removeEventListener("storage", () => { });
    };
  }, []);

  useEffect(() => {
    const fetchUserAvatar = async () => {
      try {
        const res = await apiClient.get('/users/profile');
        if (res.data?.avatarUrl) {
          setAvatarUrl(res.data.avatarUrl);
        }
      } catch (error) {
        // Avatar fetch failed silently
      }
    };

    fetchUserAvatar();
  }, []);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleConfirmLogout = async () => {
    try {
      await apiClient.post("/users/logout");
    } catch (err) {
      // Logout API call failed silently
    }
    localStorage.removeItem("token");
    localStorage.removeItem("userId");
    localStorage.removeItem("email");
    localStorage.removeItem("role");
    setOpen(false);
    window.location.href = "/";
  };

  const handleAvatarClick = () => {
    const email = localStorage.getItem("email");
    if (email) {
      navigate(`/Profile/${email}`);
    }
  };

  return (
    <header className="participant-topbar">
      <div className="participant-topbar-content">
        {/* Left: LOGO + Project title */}
        <div className="participant-topbar-left">
          <img src={logo} alt="Logo" className="participant-logo" />
          <h1 className="participant-topbar-rect">Questora</h1>
        </div>

        {/* Right: Welcome message + avatar + exit */}
        <div className="participant-topbar-actions">
          <h1 className="participant-topbar-rect">👋 Hi, {userName.split('@')[0]}</h1>
          <img
            className="participant-avatar"
            src={avatarUrl || "/OIP.jpg"}
            alt="User Avatar"
            onClick={handleAvatarClick}
            style={{ cursor: "pointer" }}
          />
          <FiLogOut className="participant-logout-icon" onClick={handleOpen} />
        </div>
      </div>

      {/* Exit the pop-up window */}
      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>Log out reminder</DialogTitle>
        <DialogContent>
          <DialogContentText>Are you sure you want to log out?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleConfirmLogout} color="error">Log out</Button>
        </DialogActions>
      </Dialog>
    </header>
  );
}

export default TopBar;
