import React from "react";
import { Icons } from "@/components/shared/icons";

/**
 * LoadingSpinner Component
 * Shows a spinning loader icon.
 * Props:
 *   - message?: string
 *   - className?: string
 */
export function LoadingSpinner({ message, className }: { message?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className || ''}`}>
      <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
      {message && <span>{message}</span>}
    </div>
  );
}
