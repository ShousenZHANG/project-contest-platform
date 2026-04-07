/**
 * @file UploadMedia.js
 * @description
 * Organizer uploads media (images/videos) for a specific competition.
 * Features:
 *  - Display existing intro video and images
 *  - Upload new images and videos
 *  - Delete existing images and videos
 *  - Preview selected media before upload
 *  - Auto redirect back to Contest List after successful upload
 *
 * Role: Organizer
 * Developer: Zhaoyi Yang
 */


import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Typography, IconButton } from "@mui/material";
import { Delete as DeleteIcon } from "@mui/icons-material";
import "./Contest.css";
import apiClient from '../api/apiClient';

function UploadMedia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [existingMedia, setExistingMedia] = useState({ video: null, images: [] });
  const [contestName, setContestName] = useState("");
  const email = localStorage.getItem("email");

  const fetchCurrentMedia = useCallback(async () => {
    try {
      const res = await apiClient.get(`/competitions/${id}`);
      const data = res.data;
      setContestName(data.name || "");
      setExistingMedia({
        video: data.introVideoUrl || null,
        images: data.imageUrls || [],
      });
    } catch {
      // fetch error handled silently
    }
  }, [id]);

  useEffect(() => {
    fetchCurrentMedia();
  }, [fetchCurrentMedia]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setPreviews(selectedFiles.map(file => URL.createObjectURL(file)));
  };

  const handleDeleteImage = async (imageUrl) => {
    const confirmed = window.confirm("Are you sure you want to delete this image?");
    if (!confirmed) return;

    try {
      await apiClient.delete(`/competitions/${id}/media/image?imageUrl=${encodeURIComponent(imageUrl)}`);
      alert("✅ Image deleted successfully");
      fetchCurrentMedia();
    } catch (error) {
      alert("❌ Failed to delete image: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  const handleDeleteVideo = async () => {
    const confirmed = window.confirm("Are you sure you want to delete the intro video?");
    if (!confirmed) return;

    try {
      await apiClient.delete(`/competitions/${id}/media/video`);
      alert("✅ Video deleted successfully");
      fetchCurrentMedia();
    } catch (error) {
      alert("❌ Failed to delete video: " + (error.response?.data?.message || "Unknown error"));
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) return alert("Please select file(s) first.");
    setUploading(true);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("mediaType", file.type.startsWith("video/") ? "VIDEO" : "IMAGE");

        const res = await apiClient.post(`/competitions/${id}/media`, formData);
        if (!res.data) throw new Error("Upload failed");
      }

      alert("✅ All media uploaded successfully!");
      setFiles([]);
      setPreviews([]);
      fetchCurrentMedia();
      navigate(`/OrganizerContestList/${email}`);
    } catch {
      alert("❌ Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      
      <div className="dashboard-container">
        
        <div className="dashboard-content">
          <Typography variant="h5" gutterBottom>
            Upload Media for Contest: {contestName || id}
          </Typography>

          {existingMedia.video && (
            <div style={{ marginTop: 20, position: "relative" }}>
              <Typography variant="subtitle1">Current Intro Video</Typography>
              <video src={existingMedia.video} controls width="100%" />
              <IconButton
                onClick={handleDeleteVideo}
                style={{ position: "absolute", top: 0, right: 0, color: "red" }}
              >
                <DeleteIcon />
              </IconButton>
            </div>
          )}

          {existingMedia.images.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <Typography variant="subtitle1">Current Images</Typography>
              {existingMedia.images.map((imgUrl, i) => (
                <div key={i} style={{ position: "relative", marginBottom: 10 }}>
                  <img src={imgUrl} alt={`img-${i}`} width="100%" />
                  <IconButton
                    onClick={() => handleDeleteImage(imgUrl)}
                    style={{ position: "absolute", top: 0, right: 0, color: "red" }}
                  >
                    <DeleteIcon />
                  </IconButton>
                </div>
              ))}
            </div>
          )}

          <input
            type="file"
            data-testid="file-input"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            style={{ marginTop: 20 }}
          />

          {previews.length > 0 && (
            <div style={{ marginTop: 20 }}>
              <Typography variant="subtitle1">Preview New Uploads</Typography>
              {previews.map((url, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  {files[i]?.type?.startsWith("video/") ? (
                    <video src={url} controls width="100%" />
                  ) : (
                    <img src={url} alt={`preview-${i}`} width="100%" />
                  )}
                </div>
              ))}
            </div>
          )}

          <Button
            variant="contained"
            color="primary"
            style={{ marginTop: 20 }}
            onClick={handleUpload}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload"}
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            style={{ marginTop: 10, marginLeft: 10 }}
            onClick={() => navigate(`/OrganizerContestList/${email}`)}
          >
            Cancel
          </Button>
        </div>
      </div>
    </>
  );
}

export default UploadMedia;
