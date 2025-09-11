"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to external service in production
    if (process.env.NODE_ENV === "production") {
      // You can integrate with services like Sentry, LogRocket, etc.
      console.error("Production error:", {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-100">
          <div className="max-w-md w-full mx-auto p-6">
            <div className="card bg-base-200 shadow-xl">
              <div className="card-body text-center">
                <div className="flex justify-center mb-4">
                  <AlertTriangle className="w-16 h-16 text-error" />
                </div>

                <h2 className="card-title justify-center text-xl font-bold mb-2">
                  Something went wrong
                </h2>

                <p className="text-base-content opacity-70 mb-6">
                  We encountered an unexpected error. This has been logged and
                  we&apos;ll look into it.
                </p>

                {process.env.NODE_ENV === "development" && this.state.error && (
                  <div className="bg-base-300 p-4 rounded-lg mb-6 text-left">
                    <h3 className="font-semibold text-error mb-2">
                      Error Details:
                    </h3>
                    <p className="text-sm text-error mb-2">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <details className="text-xs text-base-content opacity-60">
                        <summary className="cursor-pointer">
                          Stack Trace
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap overflow-auto max-h-32">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                <div className="card-actions justify-center space-x-2">
                  <button
                    onClick={this.handleRetry}
                    className="btn btn-primary"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="btn btn-outline"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Go Home
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to handle errors
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error("Error caught by useErrorHandler:", error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
}

export default ErrorBoundary;
