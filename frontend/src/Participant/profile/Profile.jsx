/**
 * @file Profile.js
 * @description
 * This component allows participants to view and update their profile information.
 * Features include:
 *  - Viewing and editing basic user information (name, email, password, description).
 *  - Uploading a new profile avatar image with validation checks.
 *  - Deleting the user account with confirmation.
 *  - Providing real-time feedback through Snackbar notifications.
 *  - Utilizing Material-UI components for consistent and user-friendly design.
 * The component communicates with the backend API for fetching, updating, and deleting user data.
 *
 * Role: Participant
 * Developer: Beiqi Dai
 */


import React, { useState, useEffect } from 'react';
import './Profile.css';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Snackbar, Alert } from '@mui/material';
import BadgeIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import apiClient from '../../api/apiClient';

function Profile() {
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
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'warning' });

  const showSnackbar = (message, severity = 'warning') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = (event, reason) => {
    if (event) {
      event.stopPropagation();
    }
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

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
        showSnackbar('Password must be at least 8 characters and contain at least one uppercase letter.', 'warning');
        return;
      }
    }

    try {
      const { role, ...profileData } = formData;
      await apiClient.put('/users/profile', { ...profileData, avatarUrl });
      showSnackbar('Profile updated successfully!', 'success');
    } catch (error) {
      const msg = error.response?.data?.message || 'Error updating profile.';
      showSnackbar(msg, 'error');
    }
  };

  const handleAvatarIconClick = () => {
    setAvatarDialogOpen(true);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const newFileName = file.name.replace(/[^\w.-]/g, '_');
      const encodedFileName = encodeURIComponent(newFileName);
      const renamedFile = new File([file], encodedFileName, { type: file.type });

      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
      }

      const isValidImage = renamedFile.type.startsWith('image/');
      if (!isValidImage) {
        showSnackbar('Please select a valid image file.', 'warning');
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (renamedFile.size > maxSize) {
        showSnackbar('File size exceeds the 5MB limit. Please select a smaller image.', 'warning');
        return;
      }

      setTempAvatar(renamedFile);
      setTempAvatarUrl(URL.createObjectURL(renamedFile));
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
        setTempAvatar(null);
        setTempAvatarUrl('');
        setAvatarDialogOpen(false);
        window.location.reload(true);
      } else {
        showSnackbar('Error uploading avatar.', 'error');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to upload avatar.';
      showSnackbar(msg, 'error');
    }
  };

  const handleAvatarDialogClose = () => {
    if (tempAvatarUrl) {
      URL.revokeObjectURL(tempAvatarUrl);
    }
    setTempAvatar(null);
    setTempAvatarUrl('');
    setAvatarDialogOpen(false);

    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDeleteAccount = async () => {
    const userId = localStorage.getItem('userId');

    try {
      await apiClient.delete(`/users/${userId}`);
      showSnackbar('Your account has been deleted.', 'success');
      localStorage.removeItem("token");
      localStorage.removeItem("userId");
      localStorage.removeItem("email");
      localStorage.removeItem("role");
      setTimeout(() => {
        window.location.href = '/';
      }, 1500);
    } catch (error) {
      const msg = error.response?.data?.message || 'Error deleting account.';
      showSnackbar(msg, 'error');
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

      <div className="Participantprofile-container">

        <div className="Participantprofile-content">
          <div className="profile-badge">
            <div
              className="profile-avatar"
              style={{ position: 'relative', marginTop: '-60px' }}
              onClick={handleAvatarIconClick}
            >
              <img
                className="avatar"
                src={avatarUrl || '/OIP.jpg'}
                alt="User Avatar"
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '50%',
                  border: '3px solid white',
                  backgroundColor: 'white',
                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
                }}
              />
              <div className="edit-icon" title="Edit Avatar">Edit</div>
            </div>

            <form className="profile-form" onSubmit={handleSubmit}>
              <div className="profile-form-columns">
                <div className="form-left">
                  <div className="input-group">
                    <BadgeIcon style={{ marginRight: '8px' }} />
                    <label>Name</label>
                  </div>
                  <input type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Enter name" />

                  <div className="input-group">
                    <EmailIcon style={{ marginRight: '8px' }} />
                    <label>Email</label>
                  </div>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Enter email" />

                  <div className="input-group">
                    <LockIcon style={{ marginRight: '8px' }} />
                    <label>Password</label>
                  </div>
                  <input type="password" name="password" value={formData.password} onChange={handleChange} placeholder="Enter new password" />

                  <div className="input-group">
                    <AccountCircleIcon style={{ marginRight: '8px' }} />
                    <label>User Role</label>
                  </div>
                  <input type="text" name="role" value={formData.role} disabled style={{ backgroundColor: '#f3f3f3', cursor: 'not-allowed' }} />

                </div>

                <div className="form-right">
                  <div className="input-group">
                    <DescriptionIcon style={{ marginRight: '8px' }} />
                    <label>Description</label>
                  </div>
                  <textarea name="description" value={formData.description || ''} onChange={handleChange} placeholder="Tell us about yourself"
                    style={{ minHeight: '150px' }} />
                  <button type="submit" className="save-button">Save</button>
                  <button type="button" onClick={() => setDeleteDialogOpen(true)} className="delete-button">Delete Account</button>
                </div>
              </div>
            </form>

          </div>
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

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );

}

export default Profile;
