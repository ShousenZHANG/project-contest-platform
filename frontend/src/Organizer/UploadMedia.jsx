/**
 * @file UploadMedia.jsx
 * @description
 * Upload media (images/videos) for a competition. Migrated from MUI to shadcn/ui.
 */

import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { Trash2, Upload as UploadIcon, ImageOff } from 'lucide-react';
import { toast } from 'sonner';
import { competitionService } from '../services/competitionService';
import { queryKeys, staleTime } from '../api/queryKeys';
import { unwrap, toMessage } from '../api/queryFn';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import AuthTokenManager from '@/auth/authTokenManager';
import ConfirmDialog from '@/shared/components/ConfirmDialog';


function UploadMedia() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [confirmAction, setConfirmAction] = useState(null);
  const email = AuthTokenManager.getEmail();

  const queryClient = useQueryClient();
  const detailKey = queryKeys.competitions.detail(id);

  const { data: competition } = useQuery({
    queryKey: detailKey,
    queryFn: () => unwrap(competitionService.getById(id)),
    enabled: Boolean(id),
    staleTime: staleTime.medium,
  });

  const contestName = competition?.name || '';
  const existingMedia = {
    video: competition?.introVideoUrl || null,
    images: competition?.imageUrls || [],
  };

  const refreshMedia = () => queryClient.invalidateQueries({ queryKey: detailKey });

  const deleteImage = useMutation({
    mutationFn: (imageUrl) => unwrap(competitionService.deleteImage(id, imageUrl)),
    onSuccess: () => {
      toast.success('Image deleted');
      refreshMedia();
    },
    onError: (error) => toast.error('Failed to delete image: ' + toMessage(error)),
    onSettled: () => setConfirmAction(null),
  });

  const deleteVideo = useMutation({
    mutationFn: () => unwrap(competitionService.deleteVideo(id)),
    onSuccess: () => {
      toast.success('Video deleted');
      refreshMedia();
    },
    onError: (error) => toast.error('Failed to delete video: ' + toMessage(error)),
    onSettled: () => setConfirmAction(null),
  });

  const uploadMedia = useMutation({
    mutationFn: async (selected) => {
      // The endpoint takes one file per call, so this stays sequential.
      for (const file of selected) {
        const body = new FormData();
        body.append('file', file);
        body.append('mediaType', file.type.startsWith('video/') ? 'VIDEO' : 'IMAGE');
        await unwrap(competitionService.uploadMedia(id, body));
      }
    },
    onSuccess: () => {
      toast.success('All media uploaded successfully');
      setFiles([]);
      setPreviews([]);
      refreshMedia();
      navigate(`/OrganizerContestList/${email}`);
    },
    onError: () => toast.error('Upload failed'),
  });

  const uploading = uploadMedia.isPending;

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setPreviews(selectedFiles.map((file) => URL.createObjectURL(file)));
  };

  const requestDeleteImage = (imageUrl) => {
    setConfirmAction({
      title: 'Delete image',
      message: 'This removes the selected competition image immediately.',
      confirmLabel: 'Delete',
      onConfirm: () => deleteImage.mutate(imageUrl),
    });
  };

  const requestDeleteVideo = () => {
    setConfirmAction({
      title: 'Delete intro video',
      message: 'This removes the competition intro video immediately.',
      confirmLabel: 'Delete',
      onConfirm: () => deleteVideo.mutate(),
    });
  };

  const handleUpload = () => {
    if (files.length === 0) {
      toast.warning('Please select file(s) first.');
      return;
    }
    uploadMedia.mutate(files);
  };

  const noExistingMedia = !existingMedia.video && existingMedia.images.length === 0;

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">
          Upload Media
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage images and intro video for{' '}
          <span className="font-medium text-foreground">{contestName || id}</span>
        </p>
      </div>

      <Card className="mb-4">
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-base font-semibold">Current Media</h2>

          {noExistingMedia && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
              <ImageOff className="h-10 w-10" />
              <p className="text-sm">No media uploaded yet</p>
            </div>
          )}

          {existingMedia.video && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Intro Video</p>
              <div className="relative overflow-hidden rounded-md border border-border">
                <video src={existingMedia.video} controls className="w-full" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={requestDeleteVideo}
                  aria-label="Delete video"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {existingMedia.images.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Images</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {existingMedia.images.map((imgUrl, i) => (
                  <div
                    key={i}
                    className="relative overflow-hidden rounded-md border border-border"
                  >
                    <img src={imgUrl} alt={`img-${i}`} className="h-40 w-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute right-2 top-2"
                      onClick={() => requestDeleteImage(imgUrl)}
                      aria-label="Delete image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <h2 className="text-base font-semibold">Upload New</h2>
          <input
            type="file"
            data-testid="file-input"
            accept="image/*,video/*"
            multiple
            onChange={handleFileChange}
            className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
          />

          {previews.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Preview</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                {previews.map((url, i) => (
                  <div key={i} className="overflow-hidden rounded-md border border-border">
                    {files[i]?.type?.startsWith('video/') ? (
                      <video src={url} controls className="w-full" />
                    ) : (
                      <img src={url} alt={`preview-${i}`} className="h-40 w-full object-cover" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 mt-4 flex items-center justify-end gap-2 border-t border-border bg-background py-3">
        <Button
          variant="outline"
          onClick={() => navigate(`/OrganizerContestList/${email}`)}
        >
          Cancel
        </Button>
        <Button onClick={handleUpload} disabled={uploading}>
          <UploadIcon className="h-4 w-4" />
          {uploading ? 'Uploading...' : 'Upload'}
        </Button>
      </div>

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmAction?.title}
        message={confirmAction?.message}
        confirmLabel={confirmAction?.confirmLabel}
        confirmVariant="destructive"
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction?.onConfirm()}
      />
    </div>
  );
}

export default UploadMedia;
