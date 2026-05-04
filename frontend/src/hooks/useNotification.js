import { useState, useCallback } from 'react';

/**
 * useNotification — centralized snackbar/toast state management.
 * Replaces scattered alert() calls and ad-hoc snackbar state.
 *
 * Usage:
 *   const { notification, notify, closeNotification } = useNotification();
 *   notify.success('Competition created!');
 *   notify.error('Something went wrong.');
 *
 *   // In JSX:
 *   <NotificationSnackbar notification={notification} onClose={closeNotification} />
 */
export function useNotification() {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info', // 'success' | 'error' | 'warning' | 'info'
  });

  const notify = {
    success: useCallback((message) =>
      setNotification({ open: true, message, severity: 'success' }), []),
    error: useCallback((message) =>
      setNotification({ open: true, message, severity: 'error' }), []),
    warning: useCallback((message) =>
      setNotification({ open: true, message, severity: 'warning' }), []),
    info: useCallback((message) =>
      setNotification({ open: true, message, severity: 'info' }), []),
  };

  const closeNotification = useCallback(() =>
    setNotification(prev => ({ ...prev, open: false })), []);

  return { notification, notify, closeNotification };
}
