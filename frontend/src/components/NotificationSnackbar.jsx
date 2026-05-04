import { Snackbar, Alert } from '@mui/material';

/**
 * Shared snackbar component driven by useNotification hook.
 */
export default function NotificationSnackbar({ notification, onClose, autoHideDuration = 4000 }) {
  return (
    <Snackbar
      open={notification.open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert
        onClose={onClose}
        severity={notification.severity}
        variant="filled"
        sx={{ width: '100%' }}
      >
        {notification.message}
      </Alert>
    </Snackbar>
  );
}
