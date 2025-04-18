import React from "react";

/**
 * ErrorBanner Component
 * Displays an error or warning message in a styled banner.
 * Props:
 *   - message: string
 *   - variant: 'error' | 'warning' | 'info'
 */
export function ErrorBanner({ message, variant = 'error' }: { message: string; variant?: 'error' | 'warning' | 'info' }) {
  let color = 'bg-red-100 text-red-800 border-red-300';
  if (variant === 'warning') color = 'bg-yellow-100 text-yellow-800 border-yellow-300';
  if (variant === 'info') color = 'bg-blue-100 text-blue-800 border-blue-300';
  return (
    <div className={`border rounded px-4 py-2 mb-4 ${color}`}>{message}</div>
  );
}
