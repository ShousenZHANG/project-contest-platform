import { Box, CircularProgress, Alert, Button } from '@mui/material';

/**
 * AsyncBoundary — wraps async content with unified loading/error states.
 * Use instead of per-component CircularProgress + try-catch patterns.
 *
 * Usage:
 *   <AsyncBoundary loading={loading} error={error} onRetry={refetch}>
 *     <MyContent data={data} />
 *   </AsyncBoundary>
 */
export default function AsyncBoundary({
  loading = false,
  error = null,
  onRetry,
  loadingSize = 40,
  minHeight = 200,
  children,
}) {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={minHeight}>
        <CircularProgress size={loadingSize} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={2}>
        <Alert
          severity="error"
          action={
            onRetry ? (
              <Button color="inherit" size="small" onClick={onRetry}>
                Retry
              </Button>
            ) : undefined
          }
        >
          {typeof error === 'string' ? error : 'An unexpected error occurred. Please try again.'}
        </Alert>
      </Box>
    );
  }

  return children;
}
