import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Top-level error boundary. Renders a minimal fallback when a child throws.
 * shadcn/ui rewrite of the previous MUI version.
 */
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
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-16 w-16 text-destructive" />
          <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>
          <Button onClick={this.handleReset} className="mt-2">
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
