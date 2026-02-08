import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle size={24} className="text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Something went wrong</h3>
              <p className="text-sm text-gray-400">
                {this.props.fallbackMessage || 'This section encountered an error. Try reloading.'}
              </p>
              {this.state.error && (
                <p className="text-xs text-red-400/60 mt-2 font-mono truncate max-w-xs mx-auto">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-gray-300 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={14} />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
