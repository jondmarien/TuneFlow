"use client";
import React from 'react';

interface GlobalErrorBoundaryState {
  error: Error | null;
}

export class ClientGlobalErrorBoundary extends React.Component<{
  children: React.ReactNode;
}, GlobalErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.error('[ClientGlobalErrorBoundary]', error, info);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          background: 'rgba(255,0,0,0.95)',
          color: 'white',
          zIndex: 99999,
          padding: 24,
          fontSize: 18,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          maxHeight: '50vh',
          overflowY: 'auto',
        }}>
          <b>Global Error Overlay:</b>
          <div style={{ marginTop: 12 }}>{this.state.error.message}</div>
          <div style={{ marginTop: 8, fontSize: 14, color: '#ffdada' }}>
            Please copy this error and share it with the developer.<br />
            Try refreshing the page, or closing this tab if the error persists.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
