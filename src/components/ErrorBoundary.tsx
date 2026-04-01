import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    // Clear out standard local storage (maybe corrupt state) and reload
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 bg-[#0d0d16]">
          <div className="glass-card max-w-xl w-full p-8 rounded-3xl flex flex-col items-center text-center border border-rose-500/20 shadow-2xl">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mb-6 border border-rose-500/30">
              <AlertTriangle className="w-8 h-8 text-rose-500" />
            </div>
            
            <h1 className="text-2xl font-headline text-white mb-3">Something went wrong</h1>
            <p className="text-gray-400 mb-8 max-w-md">
              A critical error occurred while rendering the page. Our team has been notified.
            </p>

            {this.state.error && (
              <div className="w-full bg-black/40 border border-white/5 p-4 rounded-xl mb-8 text-left overflow-x-auto">
                <p className="text-rose-400 font-mono text-sm font-bold mb-2">{this.state.error.toString()}</p>
                <p className="text-gray-500 font-mono text-xs whitespace-pre-wrap">
                  {this.state.errorInfo?.componentStack}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-4 h-4" />
              Return to Login
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
