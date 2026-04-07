/**
 * @file AdminProfile.jsx
 * @description 
 * This component provides an administrative profile management page.
 * It allows admin users to:
 *  - View and update their profile information, including name, password, and description.
 *  - View their current avatar and upload a new avatar image.
 *  - Update password with validation (must be at least 8 characters and include one uppercase letter).
 * 
 * The component interacts with backend APIs for fetching user data, updating profile details,
 * and uploading avatar images. It also handles image previews locally before upload.
 * Certain fields like email and role are displayed as read-only for information purposes.
 * Material-UI components are used for dialogs and buttons.
 * 
 * Role: Admin
 * Developer: Zhaoyi Yang
 */


import React, { useState, useEffect } from 'react';
import './AdminProfile.css';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import apiClient from '../api/apiClient';

function AdminProfile() {
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
        console.error('Error fetching user data:', error);
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
        alert('❌ Password must be at least 8 characters and contain at least one uppercase letter.');
        return;
      }
    }

    try {
      const { role, ...profileData } = formData;
      const response = await apiClient.put('/users/profile', { ...profileData, avatarUrl });
      const data = response.data;
      if (data) {
        alert('Profile updated successfully');
      } else {
        alert(data.message || 'Error updating profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
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
      if (data) {
        setAvatarUrl(data.avatarUrl);

        window.location.reload();
      } else {
        alert(data.message || 'Error uploading avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
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

  useEffect(() => {
    return () => {
      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
      }
    };
  }, [tempAvatarUrl]);

  return (
    <>
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
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              disabled
              style={{ backgroundColor: '#f3f3f3', cursor: 'not-allowed' }}
            />

            <label>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter your new password" />

            <label>Description</label>
            <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Tell us about yourself" />

            <label>User Role</label>
            <input type="text" name="role" value={formData.role} disabled style={{ backgroundColor: '#f3f3f3', cursor: 'not-allowed' }} />

            <button type="submit">Save</button>
          </form>
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
    </>
  );
}

export default AdminProfile;
