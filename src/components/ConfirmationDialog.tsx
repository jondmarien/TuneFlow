import React from "react";
import { Button } from "@/components/ui/button";

/**
 * ConfirmationDialog Component
 * Simple confirmation dialog/modal for critical actions.
 * Props:
 *   - open: boolean
 *   - title: string
 *   - description: string
 *   - onConfirm: () => void
 *   - onCancel: () => void
 */
export function ConfirmationDialog({
  open,
  title,
  description,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="mb-4 text-sm text-gray-700">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Confirm</Button>
        </div>
      </div>
    </div>
  );
}
