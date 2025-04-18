import React from "react";
import { Button } from "@/components/ui/button";

/**
 * PaginationControls Component
 * Controls for paginating comments or song lists.
 * Props:
 *   - currentPage: number
 *   - canFetchMore: boolean
 *   - onFetchMore: () => void
 *   - loading: boolean
 */
export function PaginationControls({
  currentPage,
  canFetchMore,
  onFetchMore,
  loading,
}: {
  currentPage: number;
  canFetchMore: boolean;
  onFetchMore: () => void;
  loading: boolean;
}) {
  if (!canFetchMore) return null;
  return (
    <div className="flex justify-center mt-4">
      <Button onClick={onFetchMore} disabled={loading} variant="outline">
        Check more pages for tracklist? (Page {currentPage + 1})
      </Button>
    </div>
  );
}
