import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { ErrorOutline } from '@mui/icons-material';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '50vh', gap: 2, p: 4, textAlign: 'center',
        }}>
          <ErrorOutline sx={{ fontSize: 64, color: 'error.main' }} />
          <Typography variant="h5" fontWeight={600}>Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </Typography>
          <Button variant="contained" onClick={this.handleReset} sx={{ mt: 2 }}>
            Try Again
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
