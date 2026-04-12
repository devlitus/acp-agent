import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error("[ErrorBoundary] Caught render error:", error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-void px-8">
        <div className="max-w-md w-full bg-surface-high rounded-2xl card-shadow p-10 text-center">
          <div className="text-4xl mb-6 text-primary">⬡</div>
          <h2 className="text-xl font-semibold text-on-surface font-display mb-3">Something went wrong</h2>
          <p className="text-sm text-muted mb-6 leading-relaxed">An unexpected error occurred. You can try again or go back to the hub.</p>
          {this.state.error && (
            <p className="text-xs text-red-400 bg-void rounded-lg px-4 py-3 mb-6 text-left font-mono break-all">
              {this.state.error.message}
            </p>
          )}
          <button onClick={this.handleReset} className="btn-primary px-8 py-2.5 text-sm">
            Try again
          </button>
        </div>
      </div>
    );
  }
}
