/**
 * @file OrganizerProfile.js
 * @description
 * This component allows an Organizer to view and update their profile information.
 * Functionalities include:
 *  - Update name, password, description, and avatar.
 *  - Upload a new avatar.
 *  - Delete their own account permanently.
 *  - Password must meet specific strength criteria (minimum 8 characters, at least one uppercase letter).
 *
 * The email and role fields are read-only.
 *
 * Role: Organizer
 * Developer: Zhaoyi Yang
 */


import React, { useState, useEffect } from 'react';
import './Profile.css';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import apiClient from '../api/apiClient';

function OrganizerProfile() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    description: '',
    role: localStorage.getItem('role') || ''
  });

  const [avatarDialogOpen, setAvatarDialogOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [tempAvatar, setTempAvatar] = useState(null);
  const [tempAvatarUrl, setTempAvatarUrl] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await apiClient.get('/users/profile');
        const data = response.data;
        if (data) {
          setFormData({
            name: data.name || '',
            email: data.email || '',
            password: '',
            description: data.description || '',
            role: localStorage.getItem('role') || ''
          });
          setAvatarUrl(data.avatarUrl);
        }
      } catch (error) {
        // Failed to fetch user data
      }
    };

    fetchUserData();
  }, []);


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password) {
      const passwordRegex = /^(?=.*[A-Z]).{8,}$/;
      if (!passwordRegex.test(formData.password)) {
        alert('Password must be at least 8 characters and contain at least one uppercase letter.');
        return;
      }
    }

    try {
      const { role, ...profileData } = formData;
      await apiClient.put('/users/profile', { ...profileData, avatarUrl });
      alert('Profile updated successfully');
    } catch (error) {
      const msg = error.response?.data?.message || 'Error updating profile';
      alert(msg);
    }
  };

  const handleAvatarIconClick = () => {
    setAvatarDialogOpen(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
      }
      setTempAvatar(file);
      setTempAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleAvatarSave = async () => {
    if (!tempAvatar) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', tempAvatar);

    try {
      const response = await apiClient.post('/users/profile/avatar', formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const data = response.data;
      if (data?.avatarUrl) {
        setAvatarUrl(data.avatarUrl);
        window.location.reload();
      } else {
        alert('Error uploading avatar');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error uploading avatar';
      alert(msg);
    }

    setTempAvatar(null);
    setTempAvatarUrl('');
    setAvatarDialogOpen(false);
  };

  const handleAvatarDialogClose = () => {
    if (tempAvatarUrl) {
      URL.revokeObjectURL(tempAvatarUrl);
    }
    setTempAvatar(null);
    setTempAvatarUrl('');
    setAvatarDialogOpen(false);
  };

  const handleDeleteAccount = async () => {
    const userId = localStorage.getItem('userId');

    try {
      await apiClient.delete(`/users/${userId}`);
      alert('Your account has been deleted.');
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("email");
      localStorage.removeItem("role");
      window.location.href = '/';
    } catch (error) {
      const msg = error.response?.data?.message || 'Error deleting account.';
      alert(msg);
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  useEffect(() => {
    return () => {
      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
      }
    };
  }, [tempAvatarUrl]);

  return (
    <>

      <div className="profile-container">

        <div className="profile-content">
          <div className="profile-header">
            <div className="profile-avatar" onClick={handleAvatarIconClick}>
              <img
                className="avatar"
                src={avatarUrl || '/OIP.jpg'}
                alt="User Avatar"
                style={{ width: '80px', height: '80px', borderRadius: '50%' }}
              />
            </div>
          </div>

          <form className="profile-form" onSubmit={handleSubmit}>
            <label>Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter your name" />

            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter your email" />

            <label>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your new password" />

            <label>Description</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Tell us about yourself" />

            <label>User Role</label>
            <input type="text" name="role" value={formData.role} disabled style={{ backgroundColor: '#f3f3f3', cursor: 'not-allowed' }} />

            <button type="submit">Save</button>
            <button type="button" onClick={() => setDeleteDialogOpen(true)} style={{ marginTop: '10px', backgroundColor: '#f44336', color: 'white' }}>Delete Account</button>
          </form>
        </div>
      </div>

      <Dialog open={avatarDialogOpen} onClose={handleAvatarDialogClose}>
        <DialogTitle>Upload Avatar</DialogTitle>
        <DialogContent>
          <input accept="image/*" type="file" onChange={handleAvatarChange} style={{ marginTop: '16px' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAvatarDialogClose}>Cancel</Button>
          <Button onClick={handleAvatarSave} variant="contained">Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Account</DialogTitle>
        <DialogContent>Are you sure you want to delete your account? This action is irreversible.</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteAccount} color="error">Delete</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default OrganizerProfile;
