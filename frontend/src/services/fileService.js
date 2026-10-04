import apiClient from '../api/apiClient';

/** Fetch through the gateway so protected files receive the current session. */
export const fileService = {
  download: async (fileUrl, fileName) => {
    const gateway = new URL(apiClient.defaults.baseURL, window.location.origin);
    const target = new URL(fileUrl, gateway);
    // Never attach credentials to a storage URL or an arbitrary external host.
    if (
      target.origin !== gateway.origin ||
      !/^\/submissions\/(?:public\/)?[^/]+\/download$/.test(target.pathname) ||
      target.search ||
      target.hash
    ) {
      throw new Error('This file link is unavailable. Please refresh and try again.');
    }
    const response = await apiClient.get(fileUrl, { responseType: 'blob' });
    const objectUrl = URL.createObjectURL(response.data);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName || 'submission';
    document.body.appendChild(anchor);
    try {
      anchor.click();
    } finally {
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  },
};
