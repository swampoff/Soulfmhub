import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RouterProvider } from 'react-router';
import { AppProvider } from '../context/AppContext';
import { router } from './routes';
import { Button } from './components/ui/button';
const soulFmLogo = '/favicon.ico'; // Updated to avoid Vercel build break

// ── Error Boundary Component ─────────────────────────────────────────
class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#0a1628] via-[#0d1a2d] to-[#0a1628]">
          <div className="text-center max-w-md px-6">
            <img
              src={soulFmLogo}
              alt="Soul FM"
              className="h-20 w-auto mx-auto mb-6"
              style={{
                filter: 'drop-shadow(0 0 20px rgba(0, 217, 255, 0.4))',
              }}
            />
            <h1 className="text-2xl font-bold text-[#00d9ff] mb-3">
              Something went wrong
            </h1>
            <p className="text-cyan-100/60 mb-6 text-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="bg-gradient-to-r from-[#00d9ff] to-[#00ffaa] text-slate-900 font-bold px-6 py-3"
            >
              Reload App
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── App ──────────────────────────────────────────────────────────────
export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <RouterProvider router={router} />
      </AppProvider>
    </ErrorBoundary>
  );
}
